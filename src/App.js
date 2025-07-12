import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import {
    getAuth,
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    signInAnonymously,
    sendEmailVerification
} from 'firebase/auth';
import {
    getFirestore,
    doc,
    setDoc,
    getDoc,
    collection,
    getDocs,
    onSnapshot,
    updateDoc,
    serverTimestamp,
    deleteDoc,
    addDoc,
    query,
    orderBy,
    arrayUnion,
    arrayRemove,
    where,
    writeBatch
} from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { motion, AnimatePresence } from 'framer-motion';
import toast, { Toaster } from 'react-hot-toast';
import VideoCall from './VideoCall';
import { formatDistanceToNow } from 'date-fns';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LandingPage from './LandingPage';
import {
    Swords, Gamepad2, UserPlus, LogOut, XCircle, Heart, MessageSquare, Share2, SkipBack, CircleUserRound, MailCheck, ShieldCheck, Trash2, PlusCircle, Bell, Send, Users, Video, Phone, Image as ImageIcon
} from 'lucide-react';

// --- Firebase Configuration ---
const firebaseConfig = {
    apiKey: "AIzaSyDN4B8t_TLVonCONQLX6pqpa5kSVWs39iU",
    authDomain: "connectsphere-app.firebaseapp.com",
    projectId: "connectsphere-app",
    storageBucket: "connectsphere-app.firebasestorage.app",
    messagingSenderId: "98950537255",
    appId: "1:98950537255:web:dff29455472007207dee02",
    measurementId: "G-3NX3L3D5X1"
};

const appId = typeof window !== 'undefined' && typeof window.__app_id !== 'undefined' ? window.__app_id : 'project-knockout-esports';
const ADMIN_UIDS = ['UgIZ03wrcSSeN3MkjPjEUKfm6BF2']; // Replace with your actual Firebase UID for admin access

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
export const db = getFirestore(app);
const storage = getStorage(app);
export default function App() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setUser(user);
            setLoading(false);
        });
        return unsubscribe;
    }, []);

    if (loading) return <LoadingScreen />;

    return (
        <Router>
            <Routes>
                <Route
                    path="/"
                    element={user ? <Navigate to="/app" replace /> : <LandingPage />}
                />
                <Route path="/app" element={<MainApp />} />
            </Routes>
        </Router>
    );
}
// --- Main App Component ---
function MainApp() {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState('feed');
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [showVerificationMessage, setShowVerificationMessage] = useState(false);
    const [activeChat, setActiveChat] = useState(null);

    const isAdmin = useMemo(() => user && ADMIN_UIDS.includes(user.uid), [user]);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setLoading(true);
            if (currentUser && !currentUser.isAnonymous) {
                if (currentUser.emailVerified) {
                    setUser(currentUser);
                    const profileRef = doc(db, `artifacts/${appId}/users`, currentUser.uid);
                    const profileSnap = await getDoc(profileRef);
                    if (profileSnap.exists()) {
                        setProfile({ uid: currentUser.uid, ...profileSnap.data() });
                    } else {
                        const newProfile = {
                            uid: currentUser.uid,
                            username: `User_${currentUser.uid.substring(0, 6)}`,
                            interests: ['Gaming', 'Movies', 'Music'],
                            influence: 100,
                            bio: 'Excited to connect with new people!',
                            createdAt: serverTimestamp(),
                            avatar: `https://api.dicebear.com/8.x/pixel-art/svg?seed=${user.uid}`,
                            friends: [],
                            friendRequests: [],
                            sentFriendRequests: [],
                            legacyUser: false,
                            premiumAccess: false
                        };
                        await setDoc(profileRef, newProfile);
                        setProfile(newProfile);
                    }
                    setShowAuthModal(false);
                    setShowVerificationMessage(false);
                } else {
                    setUser(null);
                    setProfile(null);
                    await signOut(auth);
                    setShowAuthModal(true);
                    setShowVerificationMessage(true);
                }
            } else if (currentUser && currentUser.isAnonymous) {
                setUser(currentUser);
                setProfile({ username: 'Guest', isAnonymous: true, influence: 0, avatar: `https://api.dicebear.com/8.x/pixel-art/svg?seed=guest` });
                setShowVerificationMessage(false);
            } else {
                try {
                    if (!auth.currentUser) await signInAnonymously(auth);
                } catch (error) {
                    console.error("Error signing in anonymously:", error);
                }
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (user && !user.isAnonymous) {
            const profileRef = doc(db, `artifacts/${appId}/users`, user.uid);
            const unsubscribe = onSnapshot(profileRef, (doc) => {
                if (doc.exists()) { setProfile({ uid: user.uid, ...doc.data() }); }
            });
            return () => unsubscribe();
        }
    }, [user, user?.uid]);

    const handleLogout = async () => {
        await signOut(auth);
        setUser(null);
        setProfile(null);
        setPage('feed');
        setShowVerificationMessage(false);
    };

    const handleDeletePost = async (postId, imageUrl) => {
        // eslint-disable-next-line no-restricted-globals
        if (confirm('Are you sure you want to delete this post?')) {
            try {
                const postRef = doc(db, `artifacts/${appId}/public/data/feed`, postId);
                await deleteDoc(postRef);

                if (imageUrl) {
                    const imageRef = ref(storage, imageUrl);
                    await deleteObject(imageRef);
                }

                toast.success('Post deleted successfully!');
            } catch (error) {
                console.error("Error deleting post:", error);
                toast.error('Failed to delete post.');
            }
        }
    };


    const renderPage = () => {
        if (!user || !profile) return <LoadingScreen />;

        if (activeChat) {
            return <ChatScreen match={activeChat} user={user} onClose={() => setActiveChat(null)} />;
        }

        switch (page) {
            case 'feed':
                return <FeedPage user={user} profile={profile} setShowAuthModal={setShowAuthModal} handleDeletePost={handleDeletePost} isAdmin={isAdmin} />;
            case 'discover':
                return user.isAnonymous ? <AuthWall setShowAuthModal={setShowAuthModal} feature="discovering new people" /> : <DiscoverPage user={user} profile={profile} />;
            case 'alerts':
                return user.isAnonymous ? <AuthWall setShowAuthModal={setShowAuthModal} feature="your alerts" /> : <AlertsPage user={user} profile={profile} setActiveChat={setActiveChat} />;
            case 'groups':
                return <GroupsPage user={user} profile={profile} setShowAuthModal={setShowAuthModal} />;
            case 'profile':
                return user.isAnonymous ? <AuthWall setShowAuthModal={setShowAuthModal} feature="your profile" /> : <Profile user={user} profile={profile} setProfile={setProfile} handleLogout={handleLogout} />;
            case 'admin':
                return isAdmin ? <AdminPanel /> : <FeedPage user={user} profile={profile} setShowAuthModal={setShowAuthModal} />;
            default:
                return <FeedPage user={user} profile={profile} setShowAuthModal={setShowAuthModal} />;
        }
    };

    if (loading) return <LoadingScreen />;

    return (
        <div className="h-screen bg-black text-white font-sans flex flex-col">
            <Toaster toastOptions={{ style: { background: '#333', color: '#fff' } }} />
            <main className="flex-1 overflow-y-hidden">
                {renderPage()}
            </main>
            {!activeChat && <BottomNav page={page} setPage={setPage} isAdmin={isAdmin} user={user} />}
            {showAuthModal && <AuthModal setShowModal={setShowAuthModal} setShowVerificationMessage={setShowVerificationMessage} showVerificationMessage={showVerificationMessage} />}
        </div>
    );
}
// --- Navigation ---
function BottomNav({ page, setPage, isAdmin, user }) {
    const [alertCount, setAlertCount] = useState(0);

    useEffect(() => {
        if (!user || user.isAnonymous) return;
        const profileRef = doc(db, `artifacts/${appId}/users`, user.uid);
        const unsubscribe = onSnapshot(profileRef, (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                setAlertCount(data.friendRequests?.length || 0);
            }
        });
        return () => unsubscribe();
    }, [user]);

    const navItems = [
        { name: 'feed', icon: Gamepad2, label: 'Feed' },
        { name: 'discover', icon: Swords, label: 'Discover' },
        { name: 'groups', icon: Users, label: 'Groups' },
        { name: 'alerts', icon: Bell, label: 'Alerts', notificationCount: alertCount },
        { name: 'profile', icon: CircleUserRound, label: 'Profile' },
    ];

    if (isAdmin) {
        navItems.push({ name: 'admin', icon: ShieldCheck, label: 'Admin' });
    }

    return (
        <nav className="bg-black/80 backdrop-blur-sm border-t border-gray-800 flex justify-around items-center h-16 sm:h-20 flex-shrink-0 z-30">
            {navItems.map(item => (
                <button key={item.name} onClick={() => setPage(item.name)} className={`relative flex flex-col items-center justify-center h-full w-full transition-colors duration-200 ${page === item.name ? 'text-blue-500' : 'text-gray-400 hover:text-white'}`}>
                    <item.icon className="h-6 w-6 sm:h-7 sm:w-7 mb-1" />
                    <span className="text-xs sm:text-sm">{item.label}</span>
                    {item.notificationCount > 0 && (
                        <span className="absolute top-1 right-1/4 -translate-y-1/2 translate-x-1/2 bg-red-600 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                            {item.notificationCount}
                        </span>
                    )}
                </button>
            ))}
        </nav>
    );
}


// --- Auth Components ---
function AuthModal({ setShowModal, setShowVerificationMessage, showVerificationMessage }) {
    const [authPage, setAuthPage] = useState('login');

    if (showVerificationMessage) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
                <div className="bg-gray-900 border border-gray-700 p-8 rounded-2xl shadow-2xl w-full max-w-sm text-center">
                    <MailCheck className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold mb-2 text-white">Verify Your Email</h2>
                    <p className="text-gray-400 mb-6">A verification link has been sent to your email address. Please click the link to continue.</p>
                    <button onClick={() => { setShowModal(false); setShowVerificationMessage(false); }} className="w-full p-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-bold">Close</button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 border border-gray-700 p-6 rounded-2xl shadow-2xl w-full max-w-sm relative">
                <button onClick={() => setShowModal(false)} className="absolute top-3 right-3 text-gray-500 hover:text-white">
                    <XCircle />
                </button>
                <div className="flex justify-center mb-6">
                    <button onClick={() => setAuthPage('login')} className={`px-6 py-2 rounded-l-lg text-sm font-bold transition-colors ${authPage === 'login' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300'}`}>LOGIN</button>
                    <button onClick={() => setAuthPage('signup')} className={`px-6 py-2 rounded-r-lg text-sm font-bold transition-colors ${authPage === 'signup' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}>SIGN UP</button>
                </div>
                {authPage === 'login' ? <Login setShowModal={setShowModal} setShowVerificationMessage={setShowVerificationMessage} /> : <SignUp setShowModal={setShowModal} setShowVerificationMessage={setShowVerificationMessage} />}
            </div>
        </div>
    );
}

function Login({ setShowModal, setShowVerificationMessage }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        try {
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            if (!userCredential.user.emailVerified) {
                setError('Please verify your email before logging in.');
                setShowVerificationMessage(true);
                await signOut(auth);
                return;
            }
            setShowModal(false);
        } catch (err) {
            setError('Invalid credentials or unverified email.');
        }
    };
    return (
        <form onSubmit={handleLogin} className="space-y-4">
            <h2 className="text-2xl font-bold text-center text-gray-200">Welcome Back</h2>
            {error && <p className="text-yellow-400 text-center bg-yellow-900/50 p-2 rounded">{error}</p>}
            <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-3 bg-gray-800 rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500" required />
            <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-3 bg-gray-800 rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500" required />
            <button type="submit" className="w-full p-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-bold transition-transform hover:scale-105">LOG IN</button>
        </form>
    );
}

function SignUp({ setShowModal, setShowVerificationMessage }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [username, setUsername] = useState('');
    const [error, setError] = useState('');

    const handleSignUp = async (e) => {
        e.preventDefault();
        setError('');
        if (username.length < 3) {
            setError("Username must be at least 3 characters.");
            return;
        }
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            await sendEmailVerification(user);

            const profileRef = doc(db, `artifacts/${appId}/users`, user.uid);
            const newProfile = {
                uid: user.uid,
                username: username,
                interests: ['Gaming', 'Movies', 'Music'],
                influence: 100,
                bio: 'Excited to connect with new people!',
                createdAt: serverTimestamp(),
                avatar: `https://api.dicebear.com/8.x/pixel-art/svg?seed=${user.uid}`,
                friends: [],
                friendRequests: [],
                sentFriendRequests: [],
                legacyUser: false,
                premiumAccess: false
            };
            await setDoc(profileRef, newProfile);

            setShowVerificationMessage(true);
            setShowModal(false);

        } catch (err) {
            setError(err.message.replace('Firebase: ', ''));
        }
    };
    return (
        <form onSubmit={handleSignUp} className="space-y-4">
            <h2 className="text-2xl font-bold text-center text-gray-200">Join ConnectSphere</h2>
            {error && <p className="text-yellow-400 text-center bg-yellow-900/50 p-2 rounded">{error}</p>}
            <input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full p-3 bg-gray-800 rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500" required />
            <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-3 bg-gray-800 rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500" required />
            <input type="password" placeholder="Password (min. 6 characters)" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-3 bg-gray-800 rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500" required />
            <button type="submit" className="w-full p-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-bold transition-transform hover:scale-105">CREATE ACCOUNT</button>
        </form>
    );
}

function AuthWall({ setShowAuthModal, feature }) {
    return (
        <div className="h-full flex flex-col items-center justify-center text-center p-8">
            <UserPlus className="w-24 h-24 text-blue-500 mb-4" />
            <h2 className="text-2xl font-bold mb-2">Create an account to continue</h2>
            <p className="text-gray-400 mb-6 max-w-sm">Sign up to discover new people, post your thoughts, and access {feature}.</p>
            <button onClick={() => setShowAuthModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg transition-transform hover:scale-105">Sign Up / Login</button>
        </div>
    );
}

// --- Page Components ---

function CreatePostModal({ profile, setShowCreatePostModal }) {
    const [caption, setCaption] = useState('');
    const [imageFile, setImageFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [error, setError] = useState('');
    const [isPosting, setIsPosting] = useState(false);
    const fileInputRef = useRef(null);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImageFile(file);
            setPreview(URL.createObjectURL(file));
        }
    };

    const handlePost = async (e) => {
        e.preventDefault();
        if (!caption) {
            setError('Please add a caption.');
            return;
        }

        setIsPosting(true);
        setError('');

        try {
            let imageUrl = null;
            if (imageFile) {
                const storageRef = ref(storage, `posts/${auth.currentUser.uid}/${Date.now()}_${imageFile.name}`);
                const snapshot = await uploadBytes(storageRef, imageFile);
                imageUrl = await getDownloadURL(snapshot.ref);
            }

            const feedCollection = collection(db, `artifacts/${appId}/public/data/feed`);
            await addDoc(feedCollection, {
                userId: auth.currentUser.uid,
                username: profile.username,
                avatar: profile.avatar,
                caption,
                imageUrl,
                postType: imageFile ? 'image' : 'text',
                likes: [],
                likeCount: 0,
                commentCount: 0,
                createdAt: serverTimestamp(),
            });
            setShowCreatePostModal(false);
            toast.success('Post created!');
        } catch (err) {
            console.error("Error creating post:", err);
            setError("Could not create post. Please try again.");
            toast.error(`Failed to create post: ${err.message}`);
        } finally {
            setIsPosting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 border border-gray-700 p-6 rounded-2xl shadow-2xl w-full max-w-md relative">
                <button onClick={() => setShowCreatePostModal(false)} className="absolute top-3 right-3 text-gray-500 hover:text-white">
                    <XCircle />
                </button>
                <h2 className="text-2xl font-bold text-center text-white mb-4">Create New Post</h2>
                <form onSubmit={handlePost} className="space-y-4">
                    <div
                        className="w-full h-48 bg-gray-800 rounded-lg border-2 border-dashed border-gray-700 flex items-center justify-center cursor-pointer relative"
                        onClick={() => fileInputRef.current.click()}
                    >
                        {preview ? <img src={preview} alt="preview" className="w-full h-full object-contain rounded-lg" /> :
                            <div className="text-center text-gray-500">
                                <ImageIcon size={48} className="mx-auto" />
                                <p>Add a photo (optional)</p>
                            </div>
                        }
                    </div>
                    <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} className="hidden" />

                    <textarea
                        placeholder="Write a caption..."
                        value={caption}
                        onChange={(e) => setCaption(e.target.value)}
                        className="w-full p-3 h-24 bg-gray-800 rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        required
                    />
                    {error && <p className="text-yellow-400 text-center">{error}</p>}
                    <button type="submit" disabled={isPosting} className="w-full p-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-bold transition-all disabled:bg-gray-600 disabled:cursor-not-allowed">
                        {isPosting ? 'Posting...' : 'Post'}
                    </button>
                </form>
            </div>
        </div>
    )
}

function CommentModal({ postId, setShowCommentModal }) {
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState(null);

    useEffect(() => {
        const user = auth.currentUser;
        if (user) {
            getDoc(doc(db, `artifacts/${appId}/users`, user.uid)).then(snap => {
                if (snap.exists()) setProfile(snap.data());
            })
        }

        const commentsCol = collection(db, `artifacts/${appId}/public/data/feed/${postId}/comments`);
        const q = query(commentsCol, orderBy('createdAt', 'asc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setComments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        });
        return () => unsubscribe();
    }, [postId]);

    const handleAddComment = async (e) => {
        e.preventDefault();
        if (!newComment.trim() || !profile) return;

        const user = auth.currentUser;
        if (!user || user.isAnonymous) return;

        const commentsCol = collection(db, `artifacts/${appId}/public/data/feed/${postId}/comments`);
        await addDoc(commentsCol, {
            text: newComment,
            userId: user.uid,
            username: profile.username,
            avatar: profile.avatar,
            createdAt: serverTimestamp()
        });

        const postRef = doc(db, `artifacts/${appId}/public/data/feed`, postId);
        const postSnap = await getDoc(postRef);
        if (postSnap.exists()) {
            const currentCount = postSnap.data().commentCount || 0;
            await updateDoc(postRef, { commentCount: currentCount + 1 });
        }

        setNewComment('');
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 border border-gray-700 p-6 rounded-2xl shadow-2xl w-full max-w-lg h-[80vh] flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-white">Comments</h2>
                    <button onClick={() => setShowCommentModal(null)} className="text-gray-500 hover:text-white"><XCircle /></button>
                </div>
                <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                    {loading ? <p>Loading comments...</p> : comments.length === 0 ? <p className="text-gray-500 text-center mt-8">No comments yet.</p> :
                        comments.map(comment => (
                            <div key={comment.id} className="flex items-start gap-3">
                                <img src={comment.avatar} alt={comment.username} className="w-10 h-10 rounded-full bg-gray-700" />
                                <div className="bg-gray-800 rounded-lg p-3 flex-1">
                                    <p className="font-bold text-sm text-blue-400">@{comment.username}</p>
                                    <p className="text-white">{comment.text}</p>
                                </div>
                            </div>
                        ))
                    }
                </div>
                <form onSubmit={handleAddComment} className="mt-4 flex gap-2">
                    <input
                        type="text"
                        value={newComment}
                        onChange={e => setNewComment(e.target.value)}
                        placeholder="Add a comment..."
                        className="flex-1 p-3 bg-gray-800 rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button type="submit" className="p-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-bold">Post</button>
                </form>
            </div>
        </div>
    )
}

// --- Stories Components (FIXED) ---
function Stories({ profile, stories, onStoryClick, onAddStoryClick }) {
    const isUserAnonymous = profile?.isAnonymous;

    // Don't render the component if there are no stories and the user is a guest.
    if (isUserAnonymous && stories.length === 0) {
        return null;
    }

    return (
        <div className="w-full p-3 bg-black/50 backdrop-blur-sm overflow-x-auto whitespace-nowrap scrollbar-hide">
            <div className="flex gap-4">
                {/* Show "Your Story" button only for logged-in users */}
                {!isUserAnonymous && (
                    <div className="flex-shrink-0 text-center" onClick={onAddStoryClick}>
                        <div className="w-16 h-16 rounded-full bg-gray-700 border-2 border-dashed border-gray-500 flex items-center justify-center cursor-pointer">
                            <PlusCircle size={24} className="text-gray-400" />
                        </div>
                        <p className="text-xs mt-1">Your Story</p>
                    </div>
                )}
                {/* Map over stories fetched from Firestore */}
                {stories.map(story => (
                    <div key={story.id} className="flex-shrink-0 text-center" onClick={() => onStoryClick(story)}>
                        <img src={story.avatar} alt={story.username} className="w-16 h-16 rounded-full border-2 border-pink-500 cursor-pointer object-cover" />
                        <p className="text-xs mt-1 truncate w-16">{story.username}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}


function StoryView({ story, onClose }) {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50" onClick={onClose}>
            <div className="relative w-full h-full max-w-md max-h-[80vh]">
                <img src={story.imageUrl} alt={`Story by ${story.username}`} className="w-full h-full object-contain" />
                <div className="absolute top-4 left-4 flex items-center gap-2">
                    <img src={story.avatar} alt={story.username} className="w-10 h-10 rounded-full" />
                    <p className="font-bold text-white">{story.username}</p>
                </div>
                <button onClick={onClose} className="absolute top-4 right-4 text-white">
                    <XCircle size={32} />
                </button>
            </div>
        </div>
    );
}


function FeedPage({ user, profile, setShowAuthModal, handleDeletePost, isAdmin }) {
    const [feedItems, setFeedItems] = useState([]);
    const [stories, setStories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreatePostModal, setShowCreatePostModal] = useState(false);
    const [showCommentModalFor, setShowCommentModalFor] = useState(null);
    const [viewingStory, setViewingStory] = useState(null);

    const handleShare = async (postId) => {
        try {
            const shareData = {
                title: 'ConnectSphere Post',
                text: 'Check out this post on ConnectSphere!',
                url: `${window.location.origin}/post/${postId}`
            };

            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                await navigator.clipboard.writeText(shareData.url);
                toast.success('Link copied to clipboard!');
            }
        } catch (err) {
            console.error('Sharing failed', err);
            toast.error('Failed to share post');
        }
    };

    useEffect(() => {
        // Fetch feed posts
        const feedCollection = collection(db, `artifacts/${appId}/public/data/feed`);
        const q = query(feedCollection, orderBy('createdAt', 'desc'));
        const unsubscribeFeed = onSnapshot(q, (querySnapshot) => {
            const items = [];
            querySnapshot.forEach((doc) => {
                items.push({ id: doc.id, ...doc.data() });
            });
            setFeedItems(items);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching feed:", error);
            setLoading(false);
        });

        // Fetch stories from the last 24 hours
        const storiesCollection = collection(db, `artifacts/${appId}/public/data/stories`);
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const storiesQuery = query(storiesCollection, where('createdAt', '>', twentyFourHoursAgo), orderBy('createdAt', 'desc'));
        const unsubscribeStories = onSnapshot(storiesQuery, (querySnapshot) => {
            const storiesData = [];
            querySnapshot.forEach((doc) => {
                storiesData.push({ id: doc.id, ...doc.data() });
            });
            setStories(storiesData);
        }, (error) => {
            console.error("Error fetching stories:", error);
        });


        return () => {
            unsubscribeFeed();
            unsubscribeStories();
        }
    }, []);

    const handleCreatePostClick = () => {
        if (user.isAnonymous) {
            setShowAuthModal(true);
        } else {
            setShowCreatePostModal(true);
        }
    };

    const handleLike = async (postId, currentLikes) => {
        if (!user || user.isAnonymous) {
            setShowAuthModal(true);
            return;
        }
        const postRef = doc(db, `artifacts/${appId}/public/data/feed`, postId);
        const userHasLiked = currentLikes.includes(user.uid);

        await updateDoc(postRef, {
            likes: userHasLiked ? arrayRemove(user.uid) : arrayUnion(user.uid),
            likeCount: userHasLiked ? (currentLikes.length - 1) : (currentLikes.length + 1)
        });
    };

    if (loading) return <div className="h-full flex items-center justify-center"><p>Loading feed...</p></div>;

    return (
        <div className="h-full w-full relative flex flex-col">
            <Stories profile={profile} stories={stories} onStoryClick={setViewingStory} onAddStoryClick={() => toast('Adding stories coming soon!')} />
            <div className="flex-1 h-full w-full overflow-y-auto snap-y snap-mandatory scroll-smooth">
                {feedItems.length === 0 && (
                    <div className="h-full w-full snap-start flex flex-col items-center justify-center text-center p-4">
                        <h2 className="text-2xl font-bold">The Feed is Quiet...</h2>
                        <p className="text-gray-400 mt-2">Be the first to post something!</p>
                    </div>
                )}
                {feedItems.map(item => {
                    const hasLiked = user && item.likes && item.likes.includes(user.uid);
                    return (
                        <div key={item.id} className="h-full w-full snap-start flex-shrink-0 relative flex items-end justify-center bg-gray-900">
                            {item.postType === 'image' ? (
                                <img src={item.imageUrl} onError={(e) => e.target.src = 'https://placehold.co/1080x1920/000000/ffffff?text=Error'} alt={item.caption} className="absolute top-0 left-0 w-full h-full object-contain z-0" />
                            ) : (
                                <div className="absolute inset-0 bg-gradient-to-br from-blue-800 to-purple-800 flex items-center justify-center p-8">
                                    <p className="text-white text-3xl font-bold text-center">{item.caption}</p>
                                </div>
                            )}

                            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-t from-black/70 via-black/20 to-transparent z-10"></div>
                            <div className="z-20 w-full flex items-end p-4 pb-24 sm:pb-28 text-white">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <img src={item.avatar} alt={item.username} className="w-12 h-12 rounded-full border-2 border-white bg-gray-700 object-cover" />
                                        <p className="font-bold text-lg">@{item.username}</p>
                                    </div>
                                    <p className="text-sm mb-2">{item.caption}</p>
                                </div>
                                <div className="flex flex-col items-center gap-5">
                                    <button onClick={() => handleLike(item.id, item.likes || [])} className="flex flex-col items-center gap-1">
                                        <Heart className={`w-8 h-8 transition-colors ${hasLiked ? 'text-red-500 fill-current' : ''}`} />
                                        <span className="text-xs">{item.likeCount || 0}</span>
                                    </button>
                                    <button onClick={() => setShowCommentModalFor(item.id)} className="flex flex-col items-center gap-1">
                                        <MessageSquare className="w-8 h-8" />
                                        <span className="text-xs">{item.commentCount || 0}</span>
                                    </button>
                                    <button onClick={() => handleShare(item.id)}>
                                        <Share2 className="w-8 h-8" />
                                    </button>
                                    {(user?.uid === item.userId || isAdmin) && (
                                        <button onClick={() => handleDeletePost(item.id, item.imageUrl)} className="flex flex-col items-center gap-1">
                                            <Trash2 className="w-8 h-8 text-red-500" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
            <button onClick={handleCreatePostClick} className="absolute top-20 right-4 bg-blue-600 p-3 rounded-full shadow-lg z-30 hover:bg-blue-700 transition-colors">
                <PlusCircle />
            </button>
            {showCreatePostModal && <CreatePostModal profile={profile} setShowCreatePostModal={setShowCreatePostModal} />}
            {showCommentModalFor && <CommentModal postId={showCommentModalFor} setShowCommentModal={setShowCommentModalFor} />}
            {viewingStory && <StoryView story={viewingStory} onClose={() => setViewingStory(null)} />}
        </div>
    );
}

function DiscoverPage({ user, profile }) {
    const [challengers, setChallengers] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchChallengers = useCallback(async () => {
        if (!user || !user.uid) return;
        setLoading(true);
        const usersCol = collection(db, `artifacts/${appId}/users`);
        const usersSnapshot = await getDocs(usersCol);
        const challengerData = [];
        const myProfileSnap = await getDoc(doc(db, `artifacts/${appId}/users`, user.uid));
        const myProfile = myProfileSnap.data();
        const sentRequests = myProfile.sentFriendRequests || [];
        const friends = myProfile.friends || [];

        for (const userDoc of usersSnapshot.docs) {
            if (userDoc.id !== user.uid && !sentRequests.includes(userDoc.id) && !friends.includes(userDoc.id)) {
                challengerData.push({ id: userDoc.id, ...userDoc.data() });
            }
        }
        setChallengers(challengerData.sort(() => 0.5 - Math.random()));
        setLoading(false);
    }, [user]);

    useEffect(() => {
        fetchChallengers();
    }, [fetchChallengers]);

    const handleSwipe = async (otherUser, liked) => {
        if (liked) {
            toast.success(`Sent friend request to ${otherUser.username}!`);
            const theirProfileRef = doc(db, `artifacts/${appId}/users`, otherUser.id);
            await updateDoc(theirProfileRef, {
                friendRequests: arrayUnion({
                    uid: user.uid,
                    username: profile.username,
                    avatar: profile.avatar
                })
            });

            const myProfileRef = doc(db, `artifacts/${appId}/users`, user.uid);
            await updateDoc(myProfileRef, {
                sentFriendRequests: arrayUnion(otherUser.id)
            });
        }
        setChallengers(prev => prev.filter(c => c.id !== otherUser.id));
    };

    if (loading) return <div className="h-full flex items-center justify-center"><p>Finding people...</p></div>;

    return (
        <div className="h-full flex flex-col items-center justify-center p-4 bg-gray-900 overflow-hidden">
            <div className="relative w-full max-w-sm h-[75vh] max-h-[600px]">
                {challengers.length > 0 ? (
                    <AnimatePresence>
                        {challengers.slice(0, 3).reverse().map((challenger, index) => {
                            const isTopCard = index === challengers.slice(0, 3).length - 1;
                            return (
                                <motion.div
                                    key={challenger.id}
                                    className="absolute w-full h-full bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 overflow-hidden flex flex-col"
                                    style={{ zIndex: index }}
                                    initial={{ scale: 1 - (challengers.length - 1 - index) * 0.05, y: (challengers.length - 1 - index) * -10, opacity: 1 }}
                                    animate={{ scale: 1, y: 0, opacity: 1 }}
                                    exit={{ x: 300, opacity: 0, transition: { duration: 0.2 } }}
                                    transition={{ duration: 0.3 }}
                                    drag="x"
                                    dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                                    onDragEnd={(event, info) => {
                                        if (info.offset.x > 100) {
                                            handleSwipe(challenger, true); // Like
                                        } else if (info.offset.x < -100) {
                                            handleSwipe(challenger, false); // Dislike
                                        }
                                    }}
                                >
                                    <img src={`https://placehold.co/600x400/1f2937/ffffff?text=${challenger.username}`} className="w-full h-1/2 object-cover" alt={challenger.username} />
                                    <div className="flex-1 p-4 flex flex-col justify-between items-center text-center">
                                        <div className="flex flex-col items-center">
                                            <img src={challenger.avatar} className="w-24 h-24 rounded-full border-4 border-gray-900 -mt-16 bg-gray-700 object-cover" alt={`${challenger.username} avatar`} />
                                            <h2 className="text-3xl font-bold mt-2">{challenger.username}</h2>
                                            <p className="text-blue-400">Influence: {challenger.influence}</p>
                                            <div className="mt-4 flex flex-wrap justify-center gap-2">
                                                {challenger.interests && challenger.interests.slice(0, 3).map(interest => <span key={interest} className="bg-gray-700 text-xs px-2 py-1 rounded-full">{interest}</span>)}
                                            </div>
                                        </div>
                                        {isTopCard && (
                                            <div className="flex justify-around items-center w-full p-4">
                                                <button onClick={() => handleSwipe(challenger, false)} className="w-16 h-16 rounded-full bg-black/50 border-2 border-red-500 text-red-500 flex items-center justify-center transition-transform hover:scale-110"><XCircle className="w-8 h-8" /></button>
                                                <button onClick={() => handleSwipe(challenger, true)} className="w-16 h-16 rounded-full bg-black/50 border-2 border-green-500 text-green-500 flex items-center justify-center transition-transform hover:scale-110"><Heart className="w-8 h-8" /></button>
                                            </div>
                                        )}
                                    </div>
                                </motion.div>
                            )
                        })}
                    </AnimatePresence>
                ) : (
                    <div className="h-full w-full flex flex-col items-center justify-center text-center p-8">
                        <SkipBack className="w-24 h-24 text-gray-600 mb-4" />
                        <h2 className="text-2xl font-bold mb-2">That's everyone!</h2>
                        <p className="text-gray-400 mb-6 max-w-sm">You've seen all the profiles. Check back later for new people.</p>
                    </div>
                )}
            </div>
        </div>
    );
}


function Profile({ user, profile, setProfile, handleLogout }) {
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState({ ...profile });
    const [userPosts, setUserPosts] = useState([]);

    useEffect(() => {
        setEditData({ ...profile });
    }, [profile]);

    useEffect(() => {
        if (user && user.uid) {
            const feedCollection = collection(db, `artifacts/${appId}/public/data/feed`);
            const q = query(feedCollection, where("userId", "==", user.uid), orderBy('createdAt', 'desc'));
            const unsubscribe = onSnapshot(q, (snapshot) => {
                setUserPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            });
            return () => unsubscribe();
        }
    }, [user]);

    const handleSave = async () => {
        if (!user || !user.uid) return;
        const profileRef = doc(db, `artifacts/${appId}/users`, user.uid);
        await updateDoc(profileRef, {
            username: editData.username,
            bio: editData.bio,
            onlineId: editData.onlineId,
            twitch: editData.twitch,
            youtube: editData.youtube
        });
        setProfile(prev => ({ ...prev, ...editData }));
        setIsEditing(false);
        toast.success('Profile updated!');
    };

    if (!profile) return <LoadingScreen />;

    return (
        <div className="p-4 pt-8 h-full overflow-y-auto">
            <div className="bg-gray-800/80 rounded-lg shadow-2xl p-6 max-w-3xl mx-auto">
                <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-4">
                        <img src={profile.avatar} alt={profile.username} className="w-20 h-20 rounded-full bg-gray-700 border-2 border-blue-500 object-cover" />
                        <div>
                            {isEditing ? <input type="text" value={editData.username} onChange={e => setEditData({ ...editData, username: e.target.value })} className="text-2xl font-bold bg-gray-700 p-2 rounded-lg text-white" />
                                : <h2 className="text-2xl font-bold">{profile.username}</h2>}
                            <p className="text-gray-400">UID: {user?.uid.substring(0, 10)}...</p>
                        </div>
                    </div>
                    <button onClick={() => isEditing ? handleSave() : setIsEditing(true)} className="bg-gray-700 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-lg text-sm">{isEditing ? 'Save' : 'Edit'}</button>
                </div>

                <div className="space-y-4 my-8">
                    <h3 className="text-lg font-semibold mb-2">Bio</h3>
                    {isEditing ? <textarea value={editData.bio} onChange={e => setEditData({ ...editData, bio: e.target.value })} className="w-full bg-gray-700 p-3 rounded-lg h-24 text-sm text-white" />
                        : <p className="text-gray-300 bg-gray-900/50 p-3 rounded-lg text-sm">{profile.bio}</p>}
                </div>

                <div className="space-y-4 my-8">
                    <h3 className="text-lg font-semibold mb-2">Socials</h3>
                    {isEditing ? (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <input type="text" placeholder="Gamer ID" value={editData.onlineId || ''} onChange={e => setEditData({ ...editData, onlineId: e.target.value })} className="bg-gray-700 p-2 rounded-lg text-white" />
                            <input type="text" placeholder="Twitch Username" value={editData.twitch || ''} onChange={e => setEditData({ ...editData, twitch: e.target.value })} className="bg-gray-700 p-2 rounded-lg text-white" />
                            <input type="text" placeholder="YouTube Handle" value={editData.youtube || ''} onChange={e => setEditData({ ...editData, youtube: e.target.value })} className="bg-gray-700 p-2 rounded-lg text-white" />
                        </div>
                    ) : (
                        <div className="flex flex-wrap gap-4">
                            {profile.onlineId && <p><strong className="text-gray-400">Gamer ID:</strong> {profile.onlineId}</p>}
                            {profile.twitch && <a href={`https://twitch.tv/${profile.twitch}`} target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">Twitch</a>}
                            {profile.youtube && <a href={`https://youtube.com/${profile.youtube}`} target="_blank" rel="noopener noreferrer" className="text-red-500 hover:underline">YouTube</a>}
                        </div>
                    )}
                </div>


                <div>
                    <h3 className="text-lg font-semibold mb-4">Your Posts</h3>
                    <div className="grid grid-cols-3 gap-1">
                        {userPosts.map(post => (
                            <img key={post.id} src={post.imageUrl} alt={post.caption} className="w-full aspect-square object-cover rounded" />
                        ))}
                    </div>
                </div>

                <button onClick={handleLogout} className="w-full mt-8 p-3 bg-red-900/80 hover:bg-red-800 rounded-lg font-bold transition-colors flex items-center justify-center gap-2">
                    <LogOut className="w-5 h-5" /> Log Out
                </button>
            </div>
        </div>
    );
}

// --- Admin Panel Component ---
function AdminPanel() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        const usersCol = collection(db, `artifacts/${appId}/users`);
        const usersSnapshot = await getDocs(usersCol);
        const usersData = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setUsers(usersData);
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const handleDeleteUser = async (userIdToDelete) => {
        // eslint-disable-next-line no-restricted-globals
        if (confirm(`Are you sure you want to permanently delete user ${userIdToDelete}? This action cannot be undone.`)) {
            try {
                // This is a placeholder for a real Cloud Function call.
                const userDocRef = doc(db, `artifacts/${appId}/users`, userIdToDelete);
                await deleteDoc(userDocRef);
                toast.success(`User ${userIdToDelete} data deleted.`);
                fetchUsers();
            } catch (error) {
                console.error("Error deleting user:", error);
                toast.error("Failed to delete user data.");
            }
        }
    };

    if (loading) return <div className="h-full flex items-center justify-center"><p>Loading users...</p></div>;

    return (
        <div className="p-4 pt-8 h-full overflow-y-auto">
            <h2 className="text-3xl font-bold text-red-500 mb-6 flex items-center gap-2"><ShieldCheck /> Admin Panel</h2>
            <div className="space-y-2">
                {users.length === 0 && <p className="text-center text-gray-500">No users found.</p>}
                {users.map((user) => (
                    <div key={user.id} className="bg-gray-800/80 p-3 rounded-lg flex items-center gap-4 shadow-lg">
                        <img src={user.avatar} alt={user.username} className="w-12 h-12 rounded-full bg-gray-700 object-cover" />
                        <div className="flex-1">
                            <p className="font-bold">{user.username}</p>
                            <p className="text-sm text-gray-400">UID: {user.id}</p>
                        </div>
                        <button onClick={() => handleDeleteUser(user.id)} className="bg-red-800 hover:bg-red-700 text-white p-2 rounded-full transition-colors">
                            <Trash2 className="w-5 h-5" />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}

// --- Alerts & Chat Components ---

function AlertsPage({ user, profile, setActiveChat }) {
    const [friendRequests, setFriendRequests] = useState([]);
    const [matches, setMatches] = useState([]);
    const [view, setView] = useState('requests');
    const [incomingCall, setIncomingCall] = useState(null);

    useEffect(() => {
        const callsCol = collection(db, 'calls');
        const q = query(callsCol, where('callee', '==', user.uid));
        const unsubscribe = onSnapshot(q, snapshot => {
            snapshot.docChanges().forEach(change => {
                if (change.type === 'added') {
                    setIncomingCall({ callId: change.doc.id, ...change.doc.data() });
                }
            });
        });
        return () => unsubscribe;
    }, [user.uid]);

    useEffect(() => {
        const profileRef = doc(db, `artifacts/${appId}/users`, user.uid);
        const unsubscribe = onSnapshot(profileRef, (doc) => {
            if (doc.exists()) {
                setFriendRequests(doc.data().friendRequests || []);
            }
        });
        return unsubscribe;
    }, [user.uid]);

    useEffect(() => {
        const matchesRef = collection(db, 'matches');
        const q = query(matchesRef, where('users', 'array-contains', user.uid));
        const unsubscribe = onSnapshot(q, snapshot => {
            const loadedMatches = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setMatches(loadedMatches);
        });
        return unsubscribe;
    }, [user.uid]);

    const handleAccept = async (request) => {
        const batch = writeBatch(db);

        const currentUserRef = doc(db, `artifacts/${appId}/users`, user.uid);
        batch.update(currentUserRef, { friends: arrayUnion(request.uid), friendRequests: arrayRemove(request) });

        const otherUserRef = doc(db, `artifacts/${appId}/users`, request.uid);
        batch.update(otherUserRef, { friends: arrayUnion(user.uid) });

        const matchRef = doc(collection(db, 'matches'));
        batch.set(matchRef, {
            users: [user.uid, request.uid],
            userDetails: [{ uid: user.uid, username: profile.username, avatar: profile.avatar }, request],
            createdAt: serverTimestamp(),
            lastMessage: 'You are now friends! Say hello.'
        });

        await batch.commit();
        toast.success(`You are now friends with ${request.username}!`);
    };

    const handleDecline = async (request) => {
        const currentUserRef = doc(db, `artifacts/${appId}/users`, user.uid);
        await updateDoc(currentUserRef, {
            friendRequests: arrayRemove(request)
        });
        toast.error('Friend request declined.');
    };

    return (
        <div className="p-4 pt-8 h-full overflow-y-auto">
            {incomingCall && (
                <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-900 p-6 rounded-lg">
                        <p>Incoming call from {incomingCall.callerName || 'Unknown'}</p>
                        <button
                            onClick={async () => {
                                // Accept the call
                                setActiveChat({
                                    matchId: incomingCall.callId,
                                    opponent: {
                                        uid: incomingCall.caller,
                                        username: incomingCall.callerName || 'Caller'
                                    },
                                    isCall: true,
                                    callType: incomingCall.type
                                });
                                setIncomingCall(null);
                            }}
                            className="bg-green-600 p-2 rounded-lg mr-2"
                        >
                            Accept
                        </button>
                        <button
                            onClick={() => {
                                // Decline the call
                                deleteDoc(doc(db, 'calls', incomingCall.callId));
                                setIncomingCall(null);
                            }}
                            className="bg-red-600 p-2 rounded-lg"
                        >
                            Decline
                        </button>
                    </div>
                </div>
            )}
            <div className="flex border-b border-gray-700 mb-4">
                <button onClick={() => setView('requests')} className={`py-2 px-4 font-bold ${view === 'requests' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-400'}`}>Friend Requests</button>
                <button onClick={() => setView('matches')} className={`py-2 px-4 font-bold ${view === 'matches' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-gray-400'}`}>Chats</button>
            </div>

            {view === 'requests' && (
                <div className="space-y-3">
                    {friendRequests.length === 0 && <p className="text-center text-gray-500 mt-8">No new friend requests.</p>}
                    {friendRequests.map(request => (
                        <div key={request.uid} className="bg-gray-800 p-4 rounded-lg flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <img src={request.avatar} alt={request.username} className="w-12 h-12 rounded-full" />
                                <p><span className="font-bold">{request.username}</span> wants to connect!</p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => handleAccept(request)} className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded text-sm font-bold">Accept</button>
                                <button onClick={() => handleDecline(request)} className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm font-bold">Decline</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {view === 'matches' && (
                <div className="space-y-3">
                    {matches.length === 0 && <p className="text-center text-gray-500 mt-8">You have no chats yet. Connect with people to start talking!</p>}
                    {matches.map(match => {
                        const opponent = match.userDetails.find(u => u.uid !== user.uid);
                        return (
                            <div key={match.id} onClick={() => setActiveChat({ matchId: match.id, opponent })} className="bg-gray-800 p-4 rounded-lg flex items-center gap-3 cursor-pointer hover:bg-gray-700">
                                <img src={opponent.avatar} alt={opponent.username} className="w-12 h-12 rounded-full" />
                                <div>
                                    <p className="font-bold">{opponent.username}</p>
                                    <p className="text-sm text-gray-400 truncate">{match.lastMessage}</p>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    );
}

function ChatScreen({ match, user, onClose }) {
    const [callType, setCallType] = useState(null);
    const [callData, setCallData] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef(null);

    useEffect(() => {
        const messagesCol = collection(db, `matches/${match.matchId}/messages`);
        const q = query(messagesCol, orderBy('createdAt', 'asc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setMessages(snapshot.docs.map(doc => doc.data()));
        });
        return () => unsubscribe();
    }, [match.matchId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim()) return;

        const messagesCol = collection(db, `matches/${match.matchId}/messages`);
        await addDoc(messagesCol, {
            text: newMessage,
            senderId: user.uid,
            createdAt: serverTimestamp()
        });

        const matchRef = doc(db, 'matches', match.matchId);
        await updateDoc(matchRef, {
            lastMessage: newMessage,
            lastMessageTimestamp: serverTimestamp()
        });

        setNewMessage('');
    };
    const startCall = async (isVideo) => {
        const callId = `${user.uid}-${match.opponent.uid}-${Date.now()}`;

        const newCallData = {
            callId,
            type: isVideo ? 'video' : 'audio',
            caller: user.uid,
            callee: match.opponent.uid,
            opponent: match.opponent,
            createdAt: serverTimestamp()
        };

        await setDoc(doc(db, 'calls', callId), newCallData);
        setCallData(newCallData);
        setCallType(isVideo ? 'video' : 'audio');
    };
    return (
        <div className="h-full flex flex-col bg-gray-900">
            <header className="bg-black/80 p-4 flex items-center gap-4 border-b border-gray-800 flex-shrink-0">
                <button onClick={onClose} className="text-gray-400 hover:text-white">
                    <XCircle />
                </button>
                <img src={match.opponent.avatar} alt={match.opponent.username} className="w-10 h-10 rounded-full" />
                <div className="flex-1">
                    <h2 className="font-bold text-lg">{match.opponent.username}</h2>
                </div>
                <div className="flex gap-4">
                    <button onClick={() => setCallType(false)} className="text-gray-400 hover:text-white"><Phone /></button>
                    <button onClick={() => setCallType(true)} className="text-gray-400 hover:text-white"><Video /></button>
                </div>
            </header>
            {callType && (
                <VideoCall
                    callData={callData}
                    user={user}
                    onClose={() => {
                        setCallType(null);
                        setCallData(null);
                    }}
                />
            )}
            <div className="flex-1 p-4 overflow-y-auto space-y-4">
                {messages.map((msg, index) => (
                    <div key={index} className={`flex gap-3 ${msg.senderId === user.uid ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-xs md:max-w-md p-3 rounded-2xl ${msg.senderId === user.uid ? 'bg-blue-600 rounded-br-none' : 'bg-gray-700 rounded-bl-none'}`}>
                            <p>{msg.text}</p>
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSendMessage} className="p-4 flex gap-2 border-t border-gray-800 flex-shrink-0">
                <input
                    type="text"
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    placeholder="Type your message..."
                    className="flex-1 p-3 bg-gray-800 rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button type="submit" className="p-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-bold"><Send /></button>
            </form>
        </div>
    )
}

function GroupsPage({ user, profile, setShowAuthModal }) {
    const [lfgPosts, setLfgPosts] = useState([]);
    const [showCreateLfg, setShowCreateLfg] = useState(false);

    useEffect(() => {
        const lfgCol = collection(db, `artifacts/${appId}/public/data/lfg`);
        const q = query(lfgCol, orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setLfgPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })))
        });
        return () => unsubscribe;
    }, []);

    const handleJoin = () => {
        if (user.isAnonymous) {
            setShowAuthModal(true);
        } else {
            toast.success("Joined group!");
        }
    }

    return (
        <div className="p-4 pt-8 h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-blue-500 flex items-center gap-2"><Users /> Looking For Group</h2>
                <button onClick={() => user.isAnonymous ? setShowAuthModal(true) : setShowCreateLfg(true)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2">
                    <PlusCircle size={20} /> Create Post
                </button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3">
                {lfgPosts.length === 0 && <p className="text-center text-gray-500 mt-8">No one is looking for a group. Create the first post!</p>}
                {lfgPosts.map(post => (
                    <div key={post.id} className="bg-gray-800 p-4 rounded-lg">
                        <div className="flex items-start gap-4">
                            <img src={post.author.avatar} alt={post.author.username} className="w-12 h-12 rounded-full" />
                            <div className="flex-1">
                                <p className="font-bold text-blue-400">{post.interests ? post.interests.join(', ') : 'General'}</p>
                                <p className="text-white my-2">{post.description}</p>
                                <div className="text-xs text-gray-400 flex items-center justify-between">
                                    <p>By @{post.author.username}</p>
                                    <p>{post.createdAt ? formatDistanceToNow(post.createdAt.toDate()) : ''} ago</p>
                                </div>
                            </div>
                            <button onClick={handleJoin} className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded text-sm font-bold">Join</button>
                        </div>
                    </div>
                ))}
            </div>
            {showCreateLfg && <CreateLFGModal profile={profile} onClose={() => setShowCreateLfg(false)} />}
        </div>
    )
}

function CreateLFGModal({ profile, onClose }) {
    const [description, setDescription] = useState('');
    const [interests, setInterests] = useState([]);
    const [error, setError] = useState('');
    const [isPosting, setIsPosting] = useState(false);

    const handlePost = async (e) => {
        e.preventDefault();
        if (!description || interests.length === 0) {
            setError('Please provide all details.');
            return;
        }
        setIsPosting(true);
        try {
            const lfgCol = collection(db, `artifacts/${appId}/public/data/lfg`);
            await addDoc(lfgCol, {
                author: {
                    uid: profile.uid,
                    username: profile.username,
                    avatar: profile.avatar
                },
                description,
                interests,
                createdAt: serverTimestamp()
            });
            onClose();
            toast.success("LFG post created!");
        } catch (err) {
            console.error(err);
            setError("Failed to create post.");
        } finally {
            setIsPosting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 border border-gray-700 p-6 rounded-2xl shadow-2xl w-full max-w-md relative">
                <button onClick={onClose} className="absolute top-3 right-3 text-gray-500 hover:text-white">
                    <XCircle />
                </button>
                <h2 className="text-2xl font-bold text-center text-white mb-4">Create LFG Post</h2>
                <form onSubmit={handlePost} className="space-y-4">
                    <select multiple value={interests} onChange={(e) => setInterests(Array.from(e.target.selectedOptions, option => option.value))} className="w-full p-3 bg-gray-800 rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
                        {profile.interests && profile.interests.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                    <textarea
                        placeholder="Describe what you're looking for... e.g., 'Anyone want to catch a movie tonight?'"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full p-3 h-24 bg-gray-800 rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        required
                    />
                    {error && <p className="text-yellow-400 text-center">{error}</p>}
                    <button type="submit" disabled={isPosting} className="w-full p-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-bold transition-all disabled:bg-gray-600 disabled:cursor-not-allowed">
                        {isPosting ? 'Posting...' : 'Create LFG Post'}
                    </button>
                </form>
            </div>
        </div>
    )
}


// --- Utility Components ---
function LoadingScreen() {
    return (
        <div className="flex items-center justify-center h-screen bg-black">
            <div className="text-center">
                <Swords className="h-16 w-16 text-blue-500 animate-pulse mx-auto" />
                <h2 className="text-2xl font-bold text-white mt-4 tracking-widest">CONNECTING...</h2>
            </div>
        </div>
    );
}