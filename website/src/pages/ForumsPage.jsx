import React, { useState, useEffect } from 'react';
import PocketBase from 'pocketbase';
import { Link, useNavigate } from 'react-router-dom';

const pb = new PocketBase('https://mmhs.pockethost.io');

export default function ForumPage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('new');
  const [user, setUser] = useState(pb.authStore.model);

  const navigate = useNavigate();

  useEffect(() => {
    fetchPosts();
  }, [sortBy]);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const sortField = sortBy === 'new' ? '-created' : '-upvotes';
      const resultList = await pb.collection('posts').getList(1, 50, {
        sort: sortField,
        expand: 'author',
      });
      setPosts(resultList.items);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (postId, voteType) => {
    try {
      const post = posts.find(p => p.id === postId);
      const updatedVotes = voteType === 'upvote' ? post.upvotes + 1 : post.upvotes - 1;

      await pb.collection('posts').update(postId, { upvotes: updatedVotes });
      fetchPosts();
    } catch (error) {
      console.error('Error voting on post:', error);
    }
  };

  const handleLogout = () => {
    pb.authStore.clear();
    setUser(null);
  };

  return (
    <div>
      <div className="bg-gradient-to-r from-blue-800 to-indigo-900 text-white p-12 flex justify-between items-center">
        <div className="container mx-auto flex flex-col items-center text-center">
          <h1 className="text-5xl font-bold mb-4">Forums</h1>
          <p className="text-xl md:text-2xl max-w-2xl mb-5">
            Ask, search, or answer any question related to the CCC.
          </p>
        </div>
      </div>

      <div className="text-right pr-12 pt-8">
        {user ? (
          <p className="text-sm">
            Logged in as <span className="font-semibold">{user.username}</span> |{' '}
            <span className="cursor-pointer underline" onClick={handleLogout}>
              Logout
            </span>
          </p>
        ) : (
          <p className="text-sm italic">
            Not logged in |{' '}
            <span className="cursor-pointer underline" onClick={() => navigate('/login')}>
              Login
            </span>
          </p>
        )}
      </div>

      <div className="p-12">
        <div className="flex justify-between mb-4">
          <div className="flex items-center">
            <span className="mr-4">Sort by:</span>
            {['new', 'top'].map(option => (
              <button
                key={option}
                onClick={() => setSortBy(option)}
                className={`mr-2 ${sortBy === option ? 'bg-blue-500 text-white' : 'bg-gray-200'} px-3 py-1 rounded`}
              >
                {option.charAt(0).toUpperCase() + option.slice(1)}
              </button>
            ))}
          </div>

          <Link
            to="/create-post"
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 transition"
          >
            Create New Post
          </Link>
        </div>

        {loading ? (
          <div className="text-center">Loading posts...</div>
        ) : (
          <div className="space-y-4">
            {posts.map(post => (
              <div key={post.id} className="border p-4 rounded shadow-md transition hover:shadow-lg">
                <h2 className="text-xl font-semibold">
                  <Link to={`/forum/${post.id}`} className="hover:underline">
                    {post.title}
                  </Link>
                </h2>
                <p className="text-gray-600">{post.body.substring(0, 100)}...</p>
                <div className="mt-2 flex justify-between items-center">
                  <span className="text-sm text-gray-500">
                    By {post.expand?.author?.username || 'Unknown'} on {new Date(post.created).toLocaleDateString()}
                  </span>
                  <div className="flex items-center space-x-2">
                    <button onClick={() => handleVote(post.id, 'upvote')} className="text-green-500">▲</button>
                    <span>{post.upvotes}</span>
                    <button onClick={() => handleVote(post.id, 'downvote')} className="text-red-500">▼</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}