import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import PocketBase from 'pocketbase';

const pb = new PocketBase('https://mmhs.pockethost.io');

export default function PostPage() {
  const { id } = useParams();
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const abortControllerRef = useRef(new AbortController());

  useEffect(() => {
    checkAuthStatus();
    fetchPost();
    fetchComments();

    return () => {
      abortControllerRef.current.abort();
    };
  }, [id]);

  const checkAuthStatus = () => {
    const isAuth = pb.authStore.isValid;
    setIsLoggedIn(isAuth);
  };

  const fetchPost = async () => {
    abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();

    try {
      const record = await pb.collection('posts').getOne(id, {
        expand: 'user',
      }, { signal: abortControllerRef.current.signal });
      setPost(record);
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error("Error fetching post:", error);
      }
    }
  };

  const fetchComments = async () => {
    try {
      const resultList = await pb.collection('comments').getList(1, 50, {
        filter: `post="${id}"`,
        sort: '-created',
        expand: 'user',
      }, { signal: abortControllerRef.current.signal });
      setComments(resultList.items);
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error("Error fetching comments:", error);
      }
    }
  };

  const handleVote = async (voteType) => {
    if (!isLoggedIn) {
      alert("Please log in to vote.");
      return;
    }
    try {
      const userId = pb.authStore.model.id;
      const existingVote = await pb.collection('votes').getFirstListItem(`user="${userId}" && post="${id}"`);
      
      if (existingVote) {
        if (existingVote.vote === (voteType === 'upvote' ? 1 : -1)) {
          // User is trying to vote the same way again, so remove their vote
          await pb.collection('votes').delete(existingVote.id);
        } else {
          // User is changing their vote
          await pb.collection('votes').update(existingVote.id, { vote: voteType === 'upvote' ? 1 : -1 });
        }
      } else {
        // New vote
        await pb.collection('votes').create({
          user: userId,
          post: id,
          vote: voteType === 'upvote' ? 1 : -1
        });
      }

      // Recalculate total votes for the post
      const votes = await pb.collection('votes').getFullList({ filter: `post="${id}"` });
      const totalVotes = votes.reduce((sum, vote) => sum + vote.vote, 0);

      // Update the post with the new vote count
      await pb.collection('posts').update(id, { upvotes: totalVotes });

      fetchPost();
    } catch (error) {
      console.error("Error voting on post:", error);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!isLoggedIn) {
      alert("Please log in to comment.");
      return;
    }
    try {
      const data = {
        text: newComment,
        post: id,
        author: pb.authStore.model.id,
      };
      await pb.collection('comments').create(data);
      setNewComment('');
      fetchComments();
    } catch (error) {
      console.error("Error adding comment:", error);
    }
  };

  if (!post) return <div>Loading...</div>;

  return (
    <div className="container mx-auto p-4">
      <Link to="/" className="text-blue-500 hover:underline mb-4 inline-block">← Back to Forum</Link>
      <h1 className="text-3xl font-bold mb-4">{post.title}</h1>
      <div className="mb-4">
        <p className="text-gray-600">{post.body}</p>
        <div className="mt-2 flex items-center space-x-4">
          <span className="text-sm text-gray-500">
            By {post.expand?.user?.username || 'Unknown'} on {new Date(post.created).toLocaleDateString()}
          </span>
          <button onClick={() => handleVote('upvote')} className="text-green-500">▲</button>
          <span>{post.upvotes}</span>
          <button onClick={() => handleVote('downvote')} className="text-red-500">▼</button>
        </div>
      </div>

      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-2">Comments</h2>
        <form onSubmit={handleAddComment} className="mb-4">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            className="w-full p-2 border rounded"
            rows="3"
            required
          />
          <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 mt-2">
            Add Comment
          </button>
        </form>
        <div className="space-y-4">
          {comments.map((comment) => (
            <div key={comment.id} className="border p-4 rounded">
              <p>{comment.text}</p>
              <div className="mt-2 text-sm text-gray-500">
                By {comment.expand?.user?.username || 'Unknown'} on {new Date(comment.created).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}