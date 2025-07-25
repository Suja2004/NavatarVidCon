import React, { useEffect, useRef, useState } from 'react';
import { ZegoUIKitPrebuilt } from '@zegocloud/zego-uikit-prebuilt';
import { useParams } from 'react-router-dom';
import axios from 'axios';

function Room() {
    const { roomID } = useParams();
    const meetingRef = useRef(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const initMeeting = async () => {
            try {
                setLoading(true);
                setError(null);

                // Generate a unique user ID and name
                const userID = Date.now().toString();
                const userName = `User_${userID.slice(-6)}`; // Use last 6 digits for shorter name

                console.log('Initializing meeting with:', { roomID, userID, userName });

                // Call your backend to get the token
                const response = await axios.post('http://localhost:5000/api/get-token', {
                    roomID,
                    userID,
                    userName,
                });

                const { token, appID } = response.data;
                console.log('Received raw token:', token);
                console.log('App ID:', appID);

                if (!token || !appID) {
                    throw new Error('No token or appID received from server');
                }

                // Generate Kit Token for production
                const kitToken = ZegoUIKitPrebuilt.generateKitTokenForProduction(
                    appID,
                    token,
                    roomID,
                    userID,
                    userName
                );

                // Create ZegoUIKitPrebuilt instance
                const zp = ZegoUIKitPrebuilt.create(kitToken);
                
                // Join the room
                zp.joinRoom({
                    container: meetingRef.current,
                    sharedLinks: [
                        {
                            name: 'Copy link',
                            url: `${window.location.origin}/room/${roomID}`,
                        },
                    ],
                    scenario: {
                        mode: ZegoUIKitPrebuilt.VideoConference, 
                    },
                    showScreenSharingButton: true,
                    showTextChat: true,
                    showUserList: true,
                    maxUsers: 10,
                    layout: "Auto",
                    showLayoutButton: true,
                });

                setLoading(false);

            } catch (err) {
                console.error('Failed to initialize meeting:', err);
                setError(err.response?.data?.error || err.message || 'Failed to join room');
                setLoading(false);
            }
        };

        if (roomID) {
            initMeeting();
        }
    }, [roomID]);

    if (loading) {
        return (
            <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                height: '100vh',
                fontSize: '18px'
            }}>
                Joining room...
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ 
                display: 'flex', 
                flexDirection: 'column',
                justifyContent: 'center', 
                alignItems: 'center', 
                height: '100vh',
                fontSize: '18px',
                color: 'red'
            }}>
                <div>Error: {error}</div>
                <button 
                    onClick={() => window.location.reload()} 
                    style={{ 
                        marginTop: '20px', 
                        padding: '10px 20px',
                        fontSize: '16px',
                        cursor: 'pointer'
                    }}
                >
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div
            className="myCallContainer"
            ref={meetingRef}
            style={{ width: '100vw', height: '100vh' }}
        />
    );
}

export default Room;