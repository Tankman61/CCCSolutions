import React, { useState, useEffect, useRef } from 'react';
import PocketBase from 'pocketbase';
import LoginForm from "../components/Login";
import { Link } from 'react-router-dom';

const pb = new PocketBase('https://mmhs.pockethost.io');

export default function ForumPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [posts, setPosts] = useState([]);
  const [sortBy, setSortBy] = useState('new');
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostBody, setNewPostBody] = useState('');
  const abortControllerRef = useRef(new AbortController());

  useEffect(() => {
    checkAuthStatus();
    fetchPosts();

    return () => {
      abortControllerRef.current.abort();
    };
  }, [sortBy]);

  const checkAuthStatus = () => {
    const isAuth = pb.authStore.isValid;
    setIsLoggedIn(isAuth);
  };

  const fetchPosts = async () => {
    abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();

    try {
      let sortField = sortBy === 'new' ? '-created' : '-upvotes';
      const resultList = await pb.collection('posts').getList(1, 50, {
        sort: sortField,
        expand: 'user,comments,voters',
      }, { signal: abortControllerRef.current.signal });
      setPosts(resultList.items);
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error("Error fetching posts:", error);
      }
    }
  };

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!isLoggedIn) {
      alert("Please log in to create a post.");
      return;
    }
    try {
      const data = {
        title: newPostTitle,
        body: newPostBody,
        author: pb.authStore.model.id,
        upvotes: 0,
      };
      await pb.collection('posts').create(data);
      setNewPostTitle('');
      setNewPostBody('');
      fetchPosts();
    } catch (error) {
      console.error("Error creating post:", error);
    }
  };

  const handleVote = async (postId, voteType) => {
    if (!isLoggedIn) {
      alert("Please log in to vote.");
      return;
    }
    try {
      const userId = pb.authStore.model.id;
      const existingVote = await pb.collection('votes').getFirstListItem(`user="${userId}" && post="${postId}"`);
      
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
          post: postId,
          vote: voteType === 'upvote' ? 1 : -1
        });
      }

      // Recalculate total votes for the post
      const votes = await pb.collection('votes').getFullList({ filter: `post="${postId}"` });
      const totalVotes = votes.reduce((sum, vote) => sum + vote.vote, 0);

      // Update the post with the new vote count
      await pb.collection('posts').update(postId, { upvotes: totalVotes });

      fetchPosts();
    } catch (error) {
      console.error("Error voting on post:", error);
    }
  };

  if (!isLoggedIn) {
    return <LoginForm onLoginSuccess={() => setIsLoggedIn(true)} />;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4">Forum</h1>
      
      <div className="mb-4">
        <label className="mr-2">Sort by:</label>
        <select 
          value={sortBy} 
          onChange={(e) => setSortBy(e.target.value)}
          className="border rounded p-1"
        >
          <option value="new">New</option>
          <option value="top">Top</option>
        </select>
      </div>

      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-2">Create New Post</h2>
        <form onSubmit={handleCreatePost} className="space-y-2">
          <input
            type="text"
            value={newPostTitle}
            onChange={(e) => setNewPostTitle(e.target.value)}
            placeholder="Post Title"
            className="w-full p-2 border rounded"
            required
          />
          <textarea
            value={newPostBody}
            onChange={(e) => setNewPostBody(e.target.value)}
            placeholder="Post Body"
            className="w-full p-2 border rounded"
            rows="3"
            required
          />
          <button type="submit" className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600">
            Create Post
          </button>
        </form>
      </div>

      <div className="space-y-4">
        {posts.map((post) => (
          <div key={post.id} className="border p-4 rounded">
            <Link to={`/forum/${post.id}`} className="text-xl font-semibold hover:underline">{post.title}</Link>
            <p className="text-gray-600">{post.body.substring(0, 100)}...</p>
            <div className="mt-2 flex justify-between items-center">
              <span className="text-sm text-gray-500">
                By {post.expand?.user?.username || 'Unknown'} on {new Date(post.created).toLocaleDateString()}
              </span>
              <div className="flex items-center space-x-2">
                <button onClick={() => handleVote(post.id, 'upvote')} className="text-green-500">▲</button>
                <span>{post.upvotes}</span>
                <button onClick={() => handleVote(post.id, 'downvote')} className="text-red-500">▼</button>
                <span className="text-sm text-gray-500">
                  Comments: {post.expand?.comments?.length || 0}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}