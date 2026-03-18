import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEvent } from 'expo';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SPACING, RADIUS, SHADOWS, TYPOGRAPHY } from '../utils/constants';

const { width } = Dimensions.get('window');

const videoSource = require('../../assets/process_video.mp4');

export const ProcessVideoSection: React.FC = () => {
    const player = useVideoPlayer(videoSource, player => {
        player.loop = true;
        player.muted = true;
        player.pause(); // Ensure it starts paused
    });

    const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing });
    const { muted: isMuted } = useEvent(player, 'mutedChange', { muted: player.muted });

    const handlePlayPause = async () => {
        if (isPlaying) {
            player.pause();
        } else {
            // Unmute when explicitly played by user
            player.muted = false;
            player.play();
        }
    };

    const toggleMute = () => {
        player.muted = !player.muted;
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>Experience the Care</Text>
                    <Text style={styles.subtitle}>See what happens after you book ✨</Text>
                </View>
            </View>

            <View style={styles.videoCard}>
                <VideoView
                    style={styles.video}
                    player={player}
                    contentFit="cover"
                    nativeControls={false}
                />

                {/* Overlay Gradient for Text readability */}
                {!isPlaying && (
                    <LinearGradient
                        colors={['rgba(0,0,0,0.3)', 'rgba(0,0,0,0.7)']}
                        style={StyleSheet.absoluteFill}
                    >
                        <View style={styles.overlayContent}>
                            <TouchableOpacity
                                style={styles.playButton}
                                onPress={handlePlayPause}
                                activeOpacity={0.8}
                            >
                                <Ionicons name="play" size={32} color="#FFFFFF" style={{ marginLeft: 4 }} />
                            </TouchableOpacity>
                            <Text style={styles.overlayText}>Watch Our Process</Text>
                        </View>
                    </LinearGradient>
                )}

                {/* Controls Overlay (visible when playing) */}
                {isPlaying && (
                    <View style={styles.controlsOverlay}>
                        <TouchableOpacity onPress={toggleMute} style={styles.iconButton}>
                            <Ionicons name={isMuted ? "volume-mute" : "volume-high"} size={20} color="#FFFFFF" />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handlePlayPause} style={styles.iconButton}>
                            <Ionicons name="pause" size={20} color="#FFFFFF" />
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: SPACING.md,
        marginBottom: SPACING.xl,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginBottom: SPACING.md,
        paddingHorizontal: 4,
    },
    title: {
        ...TYPOGRAPHY.heading,
        color: COLORS.text,
        fontSize: 20,
    },
    subtitle: {
        ...TYPOGRAPHY.bodySmall,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    videoCard: {
        width: '100%',
        height: 220, // 16:9 approx for mobile width
        borderRadius: RADIUS.xl,
        overflow: 'hidden',
        backgroundColor: '#000',
        ...SHADOWS.md,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.5)',
    },
    video: {
        width: '100%',
        height: '100%',
    },
    overlayContent: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    playButton: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'rgba(255, 255, 255, 0.25)', // Glassmorphism
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.4)',
        // @ts-ignore
        backdropFilter: 'blur(10px)', // Web support
        marginBottom: 12,
    },
    overlayText: {
        ...TYPOGRAPHY.subheading,
        color: '#FFFFFF',
        textShadow: '0px 1px 4px rgba(0, 0, 0, 0.5)',
    },
    controlsOverlay: {
        position: 'absolute',
        bottom: 12,
        right: 12,
        flexDirection: 'row',
        gap: 8,
    },
    iconButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        alignItems: 'center',
        justifyContent: 'center',
    },
});
