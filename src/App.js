import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
    where
} from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Swords, Gamepad2, Crown, UserPlus, BarChart2, LogOut, XCircle, Heart, MessageSquare, Share2, SkipBack, CircleUserRound, MailCheck, ShieldCheck, Trash2, PlusCircle
} from 'lucide-react';

// --- Firebase Configuration ---
// IMPORTANT: For security, it's best practice to use environment variables for Firebase config.
const firebaseConfig = {
    apiKey: "AIzaSyCUTN7e8b7DUwGZcr5ffqdoGUwP5vg4yhk",
    authDomain: "knockout-ca914.firebaseapp.com",
    projectId: "knockout-ca914",
    storageBucket: "knockout-ca914.firebasestorage.app",
    messagingSenderId: "39484935684",
    appId: "1:39484935684:web:0b5e6321494bf1ce142f51"
};

const appId = typeof window !== 'undefined' && typeof window.__app_id !== 'undefined' ? window.__app_id : 'project-knockout-esports';
const ADMIN_UIDS = ['2dLeJTXxuxMZsxXV30Lx8fSrJ733']; // Replace with your actual Firebase UID for admin access

// --- Firebase Initialization ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- Main App Component ---
export default function App() {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState('feed');
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [showVerificationMessage, setShowVerificationMessage] = useState(false);

    const isAdmin = useMemo(() => user && ADMIN_UIDS.includes(user.uid), [user]);

    // --- Authentication State Listener ---
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setLoading(true);
            if (currentUser && !currentUser.isAnonymous) {
                 if (currentUser.emailVerified) {
                    setUser(currentUser);
                    const profileRef = doc(db, `artifacts/${appId}/users`, currentUser.uid);
                    const profileSnap = await getDoc(profileRef);
                    if (profileSnap.exists()) {
                        setProfile({uid: currentUser.uid, ...profileSnap.data()});
                    } else {
                         const newProfile = {
                            uid: currentUser.uid,
                            username: `Fighter_${currentUser.uid.substring(0, 6)}`,
                            games: ['Street Fighter 6', 'Mortal Kombat 1', 'Tekken 8'],
                            wins: 0, losses: 0, threatScore: 1000, coins: 500,
                            bio: 'New challenger looking for an online match!',
                            createdAt: serverTimestamp(),
                            avatar: `https://api.dicebear.com/8.x/pixel-art/svg?seed=${currentUser.uid}`
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
                 setProfile({ username: 'Guest', isAnonymous: true, coins: 0, threatScore: 0, avatar: `https://api.dicebear.com/8.x/pixel-art/svg?seed=guest` });
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

    // --- Profile Update Listener ---
    useEffect(() => {
        if (user && !user.isAnonymous) {
            const profileRef = doc(db, `artifacts/${appId}/users`, user.uid);
            const unsubscribe = onSnapshot(profileRef, (doc) => {
                if(doc.exists()){ setProfile({uid: user.uid, ...doc.data()}); }
            });
            return () => unsubscribe();
        }
    }, [user]);

    const handleLogout = async () => {
        await signOut(auth);
        setUser(null);
        setProfile(null);
        setPage('feed');
        setShowVerificationMessage(false);
    };

    const renderPage = () => {
        if (!user || !profile) return <LoadingScreen />;

        switch (page) {
            case 'feed':
                return <FightFeed user={user} profile={profile} setShowAuthModal={setShowAuthModal} />;
            case 'matchmaking':
                return user.isAnonymous ? <AuthWall setShowAuthModal={setShowAuthModal} feature="matchmaking" /> : <Matchmaking user={user} />;
            case 'leaderboard':
                return <Leaderboard />;
            case 'profile':
                 return user.isAnonymous ? <AuthWall setShowAuthModal={setShowAuthModal} feature="your profile"/> : <Profile user={user} profile={profile} setProfile={setProfile} handleLogout={handleLogout}/>;
            case 'admin':
                return isAdmin ? <AdminPanel /> : <FightFeed user={user} profile={profile} setShowAuthModal={setShowAuthModal} />;
            default:
                return <FightFeed user={user} profile={profile} setShowAuthModal={setShowAuthModal} />;
        }
    };

    if (loading) return <LoadingScreen />;

    return (
        <div className="h-screen bg-black text-white font-sans flex flex-col">
            <main className="flex-1 overflow-y-hidden">
                {renderPage()}
            </main>
            <BottomNav page={page} setPage={setPage} isAdmin={isAdmin} />
            {showAuthModal && <AuthModal setShowModal={setShowAuthModal} setShowVerificationMessage={setShowVerificationMessage} showVerificationMessage={showVerificationMessage} />}
        </div>
    );
}

// --- Navigation ---
function BottomNav({ page, setPage, isAdmin }) {
    const navItems = [
        { name: 'feed', icon: Gamepad2, label: 'Feed' },
        { name: 'matchmaking', icon: Swords, label: 'Match' },
        { name: 'leaderboard', icon: BarChart2, label: 'Ranks' },
        { name: 'profile', icon: CircleUserRound, label: 'Profile' },
    ];

    if (isAdmin) {
        navItems.push({ name: 'admin', icon: ShieldCheck, label: 'Admin' });
    }

    return (
        <nav className="bg-black/80 backdrop-blur-sm border-t border-gray-800 flex justify-around items-center h-16 sm:h-20 flex-shrink-0 z-30">
            {navItems.map(item => (
                 <button key={item.name} onClick={() => setPage(item.name)} className={`flex flex-col items-center justify-center h-full w-full transition-colors duration-200 ${page === item.name ? 'text-red-500' : 'text-gray-400 hover:text-white'}`}>
                    <item.icon className="h-6 w-6 sm:h-7 sm:w-7 mb-1" />
                    <span className="text-xs sm:text-sm">{item.label}</span>
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
                    <button onClick={() => { setShowModal(false); setShowVerificationMessage(false); }} className="w-full p-3 bg-red-600 hover:bg-red-700 rounded-lg font-bold">Close</button>
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
                    <button onClick={() => setAuthPage('login')} className={`px-6 py-2 rounded-l-lg text-sm font-bold transition-colors ${authPage === 'login' ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-300'}`}>LOGIN</button>
                    <button onClick={() => setAuthPage('signup')} className={`px-6 py-2 rounded-r-lg text-sm font-bold transition-colors ${authPage === 'signup' ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-300'}`}>SIGN UP</button>
                </div>
                {authPage === 'login' ? <Login setShowModal={setShowModal} setShowVerificationMessage={setShowVerificationMessage}/> : <SignUp setShowModal={setShowModal} setShowVerificationMessage={setShowVerificationMessage} />}
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
            <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-3 bg-gray-800 rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500" required />
            <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-3 bg-gray-800 rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500" required />
            <button type="submit" className="w-full p-3 bg-red-600 hover:bg-red-700 rounded-lg font-bold transition-transform hover:scale-105">LOG IN</button>
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
        if(username.length < 3) {
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
                games: ['Street Fighter 6', 'Mortal Kombat 1', 'Tekken 8'],
                wins: 0, losses: 0, threatScore: 1000, coins: 500,
                bio: 'New challenger looking for an online match!',
                createdAt: serverTimestamp(),
                avatar: `https://api.dicebear.com/8.x/pixel-art/svg?seed=${user.uid}`
            };
            await setDoc(profileRef, newProfile);
            
            setShowVerificationMessage(true);
            
        } catch (err) {
            setError(err.message.replace('Firebase: ', ''));
        }
    };
     return (
        <form onSubmit={handleSignUp} className="space-y-4">
            <h2 className="text-2xl font-bold text-center text-gray-200">Join The Fight</h2>
            {error && <p className="text-yellow-400 text-center bg-yellow-900/50 p-2 rounded">{error}</p>}
            <input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full p-3 bg-gray-800 rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500" required />
            <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-3 bg-gray-800 rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500" required />
            <input type="password" placeholder="Password (min. 6 characters)" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-3 bg-gray-800 rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500" required />
            <button type="submit" className="w-full p-3 bg-red-600 hover:bg-red-700 rounded-lg font-bold transition-transform hover:scale-105">CREATE ACCOUNT</button>
        </form>
    );
}

function AuthWall({ setShowAuthModal, feature }) {
    return (
        <div className="h-full flex flex-col items-center justify-center text-center p-8">
            <UserPlus className="w-24 h-24 text-red-500 mb-4" />
            <h2 className="text-2xl font-bold mb-2">Create an account to continue</h2>
            <p className="text-gray-400 mb-6 max-w-sm">Sign up to challenge players, track your stats, and access {feature}.</p>
            <button onClick={() => setShowAuthModal(true)} className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-lg transition-transform hover:scale-105">Sign Up / Login</button>
        </div>
    );
}

// --- Page Components ---

function CreatePostModal({ profile, setShowCreatePostModal }) {
    const [caption, setCaption] = useState('');
    const [game, setGame] = useState(profile.games[0] || '');
    const [error, setError] = useState('');
    const [isPosting, setIsPosting] = useState(false);

    const handlePost = async (e) => {
        e.preventDefault();
        if (!caption || !game) {
            setError('Please enter a caption and select a game.');
            return;
        }
        setIsPosting(true);
        setError('');

        try {
            const feedCollection = collection(db, `artifacts/${appId}/public/data/feed`);
            await addDoc(feedCollection, {
                userId: auth.currentUser.uid,
                username: profile.username,
                avatar: profile.avatar,
                caption,
                game,
                imageUrl: `https://placehold.co/1080x1920/1a202c/ffffff?text=${encodeURIComponent(caption)}`,
                likes: [],
                likeCount: 0,
                commentCount: 0,
                createdAt: serverTimestamp(),
            });
            setShowCreatePostModal(false);
        } catch (err) {
            console.error("Error creating post:", err);
            setError("Could not create post. Please try again.");
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
                    <textarea 
                        placeholder="What's on your mind, champ?" 
                        value={caption} 
                        onChange={(e) => setCaption(e.target.value)}
                        className="w-full p-3 h-32 bg-gray-800 rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500 resize-none" 
                        required 
                    />
                    <select value={game} onChange={(e) => setGame(e.target.value)} className="w-full p-3 bg-gray-800 rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500">
                        {profile.games && profile.games.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                    {error && <p className="text-yellow-400 text-center">{error}</p>}
                    <button type="submit" disabled={isPosting} className="w-full p-3 bg-red-600 hover:bg-red-700 rounded-lg font-bold transition-all disabled:bg-gray-600 disabled:cursor-not-allowed">
                        {isPosting ? 'Posting...' : 'Post to Feed'}
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

    useEffect(() => {
        const commentsCol = collection(db, `artifacts/${appId}/public/data/feed/${postId}/comments`);
        const q = query(commentsCol, orderBy('createdAt', 'asc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setComments(snapshot.docs.map(doc => ({id: doc.id, ...doc.data()})));
            setLoading(false);
        });
        return () => unsubscribe();
    }, [postId]);

    const handleAddComment = async (e) => {
        e.preventDefault();
        if (!newComment.trim()) return;

        const user = auth.currentUser;
        if (!user || user.isAnonymous) return; // Guests can't comment

        const commentsCol = collection(db, `artifacts/${appId}/public/data/feed/${postId}/comments`);
        const userProfileRef = doc(db, `artifacts/${appId}/users`, user.uid);
        const userProfileSnap = await getDoc(userProfileRef);
        const userProfile = userProfileSnap.data();

        await addDoc(commentsCol, {
            text: newComment,
            userId: user.uid,
            username: userProfile.username,
            avatar: userProfile.avatar,
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
                                    <p className="font-bold text-sm text-red-400">@{comment.username}</p>
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
                        className="flex-1 p-3 bg-gray-800 rounded-lg border border-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                    <button type="submit" className="p-3 bg-red-600 hover:bg-red-700 rounded-lg font-bold">Post</button>
                </form>
            </div>
        </div>
    )
}


function FightFeed({ user, profile, setShowAuthModal }) {
    const [feedItems, setFeedItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreatePostModal, setShowCreatePostModal] = useState(false);
    const [showCommentModalFor, setShowCommentModalFor] = useState(null);

    useEffect(() => {
        const feedCollection = collection(db, `artifacts/${appId}/public/data/feed`);
        const q = query(feedCollection, orderBy('createdAt', 'desc'));
        
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
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

        return () => unsubscribe();
    }, []);

    const handleCreatePostClick = () => {
        if (user.isAnonymous) {
            setShowAuthModal(true);
        } else {
            setShowCreatePostModal(true);
        }
    };
    
    const handleLike = async (postId, currentLikes) => {
        if (user.isAnonymous) {
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
        <div className="h-full w-full relative">
             <div className="h-full w-full overflow-y-scroll snap-y snap-mandatory scroll-smooth">
                {feedItems.length === 0 && (
                    <div className="h-full w-full snap-start flex flex-col items-center justify-center text-center p-4">
                        <h2 className="text-2xl font-bold">The Feed is Quiet...</h2>
                        <p className="text-gray-400 mt-2">Be the first to post a highlight!</p>
                    </div>
                )}
                {feedItems.map(item => {
                    const hasLiked = user && item.likes && item.likes.includes(user.uid);
                    return (
                        <div key={item.id} className="h-full w-full snap-start flex-shrink-0 relative flex items-end justify-center">
                            <img src={item.imageUrl} onError={(e) => e.target.src='https://placehold.co/1080x1920/000000/ffffff?text=Error'} alt={item.caption} className="absolute top-0 left-0 w-full h-full object-cover z-0" />
                            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-t from-black/70 via-black/20 to-transparent z-10"></div>
                            <div className="z-20 w-full flex items-end p-4 text-white">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <img src={item.avatar} alt={item.username} className="w-12 h-12 rounded-full border-2 border-white bg-gray-700 object-cover" />
                                        <p className="font-bold text-lg">@{item.username}</p>
                                    </div>
                                    <p className="text-sm mb-2">{item.caption}</p>
                                    <p className="text-xs text-red-400 font-bold">{item.game}</p>
                                </div>
                                <div className="flex flex-col items-center gap-5">
                                    <button onClick={() => handleLike(item.id, item.likes || [])} className="flex flex-col items-center gap-1">
                                        <Heart className={`w-8 h-8 transition-colors ${hasLiked ? 'text-red-500 fill-current' : ''}`}/> 
                                        <span className="text-xs">{item.likeCount || 0}</span>
                                    </button>
                                    <button onClick={() => setShowCommentModalFor(item.id)} className="flex flex-col items-center gap-1">
                                        <MessageSquare className="w-8 h-8"/> 
                                        <span className="text-xs">{item.commentCount || 0}</span>
                                    </button>
                                    <button><Share2 className="w-8 h-8"/></button>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>
            <button onClick={handleCreatePostClick} className="absolute bottom-24 sm:bottom-28 right-4 bg-red-600 p-3 rounded-full shadow-lg z-30 hover:bg-red-700 transition-colors">
                <PlusCircle />
            </button>
            {showCreatePostModal && <CreatePostModal profile={profile} setShowCreatePostModal={setShowCreatePostModal} />}
            {showCommentModalFor && <CommentModal postId={showCommentModalFor} setShowCommentModal={setShowCommentModalFor} />}
        </div>
    );
}

function Matchmaking({ user }) {
    const [challengers, setChallengers] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchChallengers = useCallback(async () => {
        if (!user || !user.uid) return;
        setLoading(true);
        const usersCol = collection(db, `artifacts/${appId}/users`);
        const usersSnapshot = await getDocs(usersCol);
        const challengerData = [];
        for (const userDoc of usersSnapshot.docs) {
             if (userDoc.id !== user.uid) {
                challengerData.push({ id: userDoc.id, ...userDoc.data() });
            }
        }
        setChallengers(challengerData.sort(() => 0.5 - Math.random()));
        setLoading(false);
    }, [user]);

    useEffect(() => {
        fetchChallengers();
    }, [fetchChallengers]);

    const handleSwipe = (id) => {
        setChallengers(prev => prev.filter(c => c.id !== id));
    };
    
    if (loading) return <div className="h-full flex items-center justify-center"><p>Searching for eSports challengers...</p></div>;
    
    return (
        <div className="h-full flex flex-col items-center justify-center p-4 bg-gray-900 overflow-hidden">
             <div className="relative w-full max-w-sm h-[75vh] max-h-[600px]">
                {challengers.length > 0 ? (
                    <AnimatePresence>
                        {challengers.map((challenger, index) => {
                            if (index !== 0) return null; // Only render the top card
                            return (
                                 <motion.div
                                    key={challenger.id}
                                    className="absolute w-full h-full bg-gray-800 rounded-2xl shadow-2xl border border-gray-700 overflow-hidden flex flex-col"
                                    style={{ zIndex: challengers.length - index }}
                                    initial={{ scale: 0.8, y: -20, opacity: 0 }}
                                    animate={{ scale: 1, y: 0, opacity: 1 }}
                                    exit={{ x: 300, opacity: 0, transition: {duration: 0.2} }}
                                    transition={{ duration: 0.3 }}
                                    drag="x"
                                    dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                                    onDragEnd={(event, info) => {
                                        if (Math.abs(info.offset.x) > 100) {
                                            handleSwipe(challenger.id);
                                        }
                                    }}
                                >
                                    <img src={`https://placehold.co/600x400/1f2937/ffffff?text=${challenger.username}`} className="w-full h-1/2 object-cover" alt={challenger.username}/>
                                    <div className="flex-1 p-4 flex flex-col justify-between items-center text-center">
                                        <div className="flex flex-col items-center">
                                        <img src={challenger.avatar} className="w-24 h-24 rounded-full border-4 border-gray-900 -mt-16 bg-gray-700 object-cover" alt={`${challenger.username} avatar`}/>
                                        <h2 className="text-3xl font-bold mt-2">{challenger.username}</h2>
                                        <p className="text-red-400">Threat Score: {challenger.threatScore}</p>
                                        <div className="mt-4 flex flex-wrap justify-center gap-2">
                                            {challenger.games && challenger.games.slice(0, 3).map(game => <span key={game} className="bg-gray-700 text-xs px-2 py-1 rounded-full">{game}</span>)}
                                        </div>
                                        </div>
                                        <div className="flex justify-around items-center w-full p-4">
                                            <button onClick={() => handleSwipe(challenger.id)} className="w-16 h-16 rounded-full bg-black/50 border-2 border-red-500 text-red-500 flex items-center justify-center transition-transform hover:scale-110"><XCircle className="w-8 h-8"/></button>
                                            <button onClick={() => handleSwipe(challenger.id)} className="w-16 h-16 rounded-full bg-black/50 border-2 border-green-500 text-green-500 flex items-center justify-center transition-transform hover:scale-110"><Heart className="w-8 h-8"/></button>
                                        </div>
                                   </div>
                                </motion.div>
                            )
                        })}
                    </AnimatePresence>
                ) : (
                     <div className="h-full w-full flex flex-col items-center justify-center text-center p-8">
                        <SkipBack className="w-24 h-24 text-gray-600 mb-4"/>
                        <h2 className="text-2xl font-bold mb-2">No challengers found</h2>
                        <p className="text-gray-400 mb-6 max-w-sm">There's no one available to match with right now. Try again later!</p>
                    </div>
                )}
            </div>
        </div>
    );
}

function Leaderboard() {
    const [players, setPlayers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const usersCol = collection(db, `artifacts/${appId}/users`);
        const unsubscribe = onSnapshot(query(usersCol), (snapshot) => {
            const playerData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            playerData.sort((a, b) => (b.threatScore || 0) - (a.threatScore || 0));
            setPlayers(playerData);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    if (loading) return <div className="h-full flex items-center justify-center"><p>Loading leaderboard...</p></div>;

    return (
        <div className="p-4 pt-8 h-full overflow-y-auto">
            <h2 className="text-3xl font-bold text-red-500 mb-6 flex items-center gap-2"><Crown /> Global Leaderboard</h2>
            <div className="space-y-2">
                 {players.length === 0 && <p className="text-center text-gray-500">The leaderboard is empty. Be the first to make your mark!</p>}
                {players.map((player, index) => (
                    <div key={player.id} className="bg-gray-800/80 p-3 rounded-lg flex items-center gap-4 shadow-lg">
                        <span className={`text-xl font-bold w-8 text-center ${index < 3 ? 'text-yellow-400' : 'text-gray-500'}`}>{index + 1}</span>
                        <img src={player.avatar} alt={player.username} className="w-12 h-12 rounded-full bg-gray-700 object-cover"/>
                        <div className="flex-1">
                            <p className="font-bold">{player.username}</p>
                            <p className="text-sm text-green-400">Wins: {player.wins || 0} / Losses: {player.losses || 0}</p>
                        </div>
                        <div className="text-right">
                           <p className="text-lg font-bold text-red-400">{player.threatScore || 0}</p>
                           <p className="text-xs text-gray-500">Threat Score</p>
                        </div>
                    </div>
                ))}
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
        if(user && user.uid) {
            const feedCollection = collection(db, `artifacts/${appId}/public/data/feed`);
            const q = query(feedCollection, where("userId", "==", user.uid), orderBy('createdAt', 'desc'));
            const unsubscribe = onSnapshot(q, (snapshot) => {
                setUserPosts(snapshot.docs.map(doc => ({id: doc.id, ...doc.data()})));
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
        });
        setProfile(prev => ({...prev, ...editData}));
        setIsEditing(false);
    };

    const winRate = useMemo(() => {
        if (!profile || typeof profile.wins === 'undefined' || typeof profile.losses === 'undefined') return "0.0";
        const totalGames = profile.wins + profile.losses;
        return totalGames > 0 ? ((profile.wins / totalGames) * 100).toFixed(1) : "0.0";
    }, [profile]);

    if (!profile) return <LoadingScreen />;

    return (
        <div className="p-4 pt-8 h-full overflow-y-auto">
            <div className="bg-gray-800/80 rounded-lg shadow-2xl p-6 max-w-3xl mx-auto">
                <div className="flex justify-between items-start mb-6">
                     <div className="flex items-center gap-4">
                         <img src={profile.avatar} alt={profile.username} className="w-20 h-20 rounded-full bg-gray-700 border-2 border-red-500 object-cover"/>
                         <div>
                            {isEditing ? <input type="text" value={editData.username} onChange={e => setEditData({...editData, username: e.target.value})} className="text-2xl font-bold bg-gray-700 p-2 rounded-lg text-white"/>
                                       : <h2 className="text-2xl font-bold">{profile.username}</h2> }
                            <p className="text-gray-400">UID: {user?.uid.substring(0,10)}...</p>
                         </div>
                     </div>
                     <button onClick={() => isEditing ? handleSave() : setIsEditing(true)} className="bg-gray-700 hover:bg-red-600 text-white font-bold py-2 px-4 rounded-lg text-sm">{isEditing ? 'Save' : 'Edit'}</button>
                </div>

                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center my-8">
                    <div className="bg-gray-700/50 p-4 rounded-lg"><p className="text-2xl font-bold text-green-400">{profile.wins || 0}</p><p className="text-sm text-gray-400">Wins</p></div>
                    <div className="bg-gray-700/50 p-4 rounded-lg"><p className="text-2xl font-bold text-red-400">{profile.losses || 0}</p><p className="text-sm text-gray-400">Losses</p></div>
                    <div className="bg-gray-700/50 p-4 rounded-lg"><p className="text-2xl font-bold text-blue-400">{winRate}%</p><p className="text-sm text-gray-400">Win Rate</p></div>
                    <div className="bg-gray-700/50 p-4 rounded-lg"><p className="text-2xl font-bold text-yellow-400">{profile.coins || 0}</p><p className="text-sm text-gray-400">Coins</p></div>
                </div>

                <div className="space-y-4 my-8">
                    <h3 className="text-lg font-semibold mb-2">Bio</h3>
                    {isEditing ? <textarea value={editData.bio} onChange={e => setEditData({...editData, bio: e.target.value})} className="w-full bg-gray-700 p-3 rounded-lg h-24 text-sm text-white"/>
                               : <p className="text-gray-300 bg-gray-900/50 p-3 rounded-lg text-sm">{profile.bio}</p> }
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
                    <LogOut className="w-5 h-5"/> Log Out
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
                // In a production app, never allow clients to delete arbitrary documents.
                // You would trigger a Cloud Function that verifies admin privileges before deleting.
                const userDocRef = doc(db, `artifacts/${appId}/users`, userIdToDelete);
                await deleteDoc(userDocRef);

                alert(`User ${userIdToDelete} data deleted. You must still delete their Auth record from the Firebase Console.`);
                
                fetchUsers();
            } catch (error) {
                console.error("Error deleting user:", error);
                alert("Failed to delete user data.");
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
                        <img src={user.avatar} alt={user.username} className="w-12 h-12 rounded-full bg-gray-700 object-cover"/>
                        <div className="flex-1">
                            <p className="font-bold">{user.username}</p>
                            <p className="text-sm text-gray-400">UID: {user.id}</p>
                        </div>
                        <button onClick={() => handleDeleteUser(user.id)} className="bg-red-800 hover:bg-red-700 text-white p-2 rounded-full transition-colors">
                            <Trash2 className="w-5 h-5"/>
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}


// --- Utility Components ---
function LoadingScreen() {
    return (
        <div className="flex items-center justify-center h-screen bg-black">
            <div className="text-center">
                <Swords className="h-16 w-16 text-red-500 animate-pulse mx-auto" />
                <h2 className="text-2xl font-bold text-white mt-4 tracking-widest">LOADING...</h2>
            </div>
        </div>
    );
}
