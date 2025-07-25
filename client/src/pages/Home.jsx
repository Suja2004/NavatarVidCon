import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function Home() {
    const [roomId, setRoomId] = useState('');
    const navigate = useNavigate();

    const handleJoin = (e) => {
        e.preventDefault();
        if (roomId.trim()) {
            navigate(`/room/${roomId}`);
        }
    };

    return (
        <form onSubmit={handleJoin}>
            <input
                type="text"
                placeholder="Room ID"
                value={roomId}
                onChange={e => setRoomId(e.target.value)}
                required
            />
            <button type="submit">Join</button>
        </form>
    );
}

export default Home;
