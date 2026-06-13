import React, { useState, useRef, useEffect, useCallback } from 'react';
import styled, { createGlobalStyle, keyframes } from 'styled-components';
import confetti from 'canvas-confetti';

// ============ GLOBAL STYLES ============
const GlobalStyles = createGlobalStyle`
  @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;700&family=Inter:wght@300;400;600&display=swap');

  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  body {
    background: #0a0a0f;
    color: #e0e0e0;
    font-family: 'Inter', 'JetBrains Mono', sans-serif;
    overflow-x: hidden;
    min-height: 100vh;
    width: 100vw;
  }

  #root {
    width: 100%;
    min-height: 100vh;
  }

  ::selection {
    background: #00ff41;
    color: #000;
  }
`;

// ============ THEME ============
const theme = {
  green: '#00ff41',
  blue: '#4dabf7',
  purple: '#9775fa',
};

// ============ ANIMATIONS ============
const float = keyframes`
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-10px); }
`;

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
`;

const gradientShift = keyframes`
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;

const glitchEffect = keyframes`
  0% { transform: translate(0); filter: hue-rotate(0deg); }
  10% { transform: translate(-5px, 3px); filter: hue-rotate(90deg); }
  20% { transform: translate(5px, -2px); filter: hue-rotate(-90deg); }
  30% { transform: translate(-3px, -4px); }
  40% { transform: translate(4px, 2px); filter: hue-rotate(180deg); }
  50% { transform: translate(-2px, 5px); }
  60% { transform: translate(6px, -3px); filter: hue-rotate(-180deg); }
  70% { transform: translate(-5px, -2px); }
  80% { transform: translate(3px, 4px); filter: hue-rotate(90deg); }
  90% { transform: translate(-1px, -5px); }
  100% { transform: translate(0); filter: hue-rotate(0deg); }
`;

const glitchClip = keyframes`
  0% { clip-path: inset(0 0 0 0); }
  10% { clip-path: inset(10% 0 80% 0); }
  20% { clip-path: inset(30% 0 50% 0); }
  30% { clip-path: inset(60% 0 30% 0); }
  40% { clip-path: inset(80% 0 10% 0); }
  50% { clip-path: inset(40% 0 40% 0); }
  60% { clip-path: inset(0 0 60% 0); }
  70% { clip-path: inset(50% 0 0 0); }
  80% { clip-path: inset(20% 0 70% 0); }
  90% { clip-path: inset(70% 0 20% 0); }
  100% { clip-path: inset(0 0 0 0); }
`;

const crtFlicker = keyframes`
  0% { opacity: 1; }
  50% { opacity: 0.9; }
  51% { opacity: 0.3; }
  52% { opacity: 1; }
  100% { opacity: 1; }
`;

// ============ KEYBOARD SOUND HOOK ============
const useKeyboardSound = () => {
  const audioContextRef = useRef(null);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const initAudio = useCallback(() => {
    try {
      if (!audioContextRef.current) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        audioContextRef.current = new AudioContextClass();
        console.log('✅ AudioContext created:', audioContextRef.current.state);
      }
      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume().then(() => {
          console.log('✅ AudioContext resumed:', audioContextRef.current.state);
        });
      }
      setIsInitialized(true);
      setSoundEnabled(true);
      console.log('✅ Sound initialized and enabled');
    } catch (e) {
      console.error('❌ Audio init failed:', e);
    }
  }, []);

  const playSound = useCallback((type = 'key') => {
    if (!soundEnabled || !audioContextRef.current) {
      console.log('🔇 Sound disabled or no context');
      return;
    }
    
    try {
      const ctx = audioContextRef.current;
      if (ctx.state === 'closed') {
        console.log('❌ AudioContext closed');
        return;
      }
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      
      const now = ctx.currentTime;
      const duration = type === 'enter' ? 0.08 : type === 'backspace' ? 0.03 : 0.05;
      const bufferSize = Math.floor(ctx.sampleRate * duration);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      
      let freq, volume, decay;
      
      if (type === 'enter') {
        freq = 400;
        volume = 0.8;
        decay = 25;
      } else if (type === 'backspace') {
        freq = 3000;
        volume = 0.5;
        decay = 45;
      } else {
        freq = 1800 + Math.random() * 800;
        volume = 0.6;
        decay = 35;
      }
      
      // Generate noise with envelope
      for (let i = 0; i < bufferSize; i++) {
        const t = i / bufferSize;
        const envelope = Math.exp(-t * decay) * (1 - Math.exp(-t * 350));
        // Mix noise with a tone for clearer sound
        const noise = (Math.random() * 2 - 1) * 0.7;
        const tone = Math.sin(2 * Math.PI * freq * t) * 0.3;
        data[i] = (noise + tone) * envelope * volume;
      }
      
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      
      const filter = ctx.createBiquadFilter();
      filter.type = type === 'enter' ? 'lowpass' : type === 'backspace' ? 'highpass' : 'bandpass';
      filter.frequency.setValueAtTime(freq, now);
      filter.Q.setValueAtTime(1.5, now);
      
      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(1.0, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + duration);
      
      source.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      source.start(now);
      source.stop(now + duration);
      
      console.log(`🔊 Played ${type} sound at volume ${volume}`);
    } catch (e) {
      console.error('❌ Play sound error:', e);
    }
  }, [soundEnabled]);

  const toggleSound = useCallback(() => {
    if (!isInitialized) {
      initAudio();
    } else {
      setSoundEnabled(prev => !prev);
      console.log('🔊 Sound:', !soundEnabled ? 'ON' : 'OFF');
    }
  }, [isInitialized, initAudio]);

  return { 
    soundEnabled, 
    isInitialized,
    toggleSound, 
    playKeySound: () => playSound('key'), 
    playEnterSound: () => playSound('enter'), 
    playBackspaceSound: () => playSound('backspace'),
    initAudio 
  };
};
// ============ STYLED COMPONENTS ============
const AppContainer = styled.div`
  min-height: 100vh;
  width: 100%;
  position: relative;
  overflow-x: hidden;
  background: linear-gradient(135deg, #0a0a0f 0%, #0d1520 25%, #0f0a1a 50%, #0a1a15 75%, #0a0a0f 100%);
  background-size: 400% 400%;
  animation: ${gradientShift} 15s ease infinite;
`;

const GlitchOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  pointer-events: none;
  z-index: 9999;
  opacity: ${props => props.active ? 1 : 0};
  transition: opacity 0.1s;
  animation: ${props => props.active ? glitchEffect : 'none'} 0.3s ease-in-out;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      0deg,
      rgba(0, 255, 65, 0.15) 0%,
      transparent 10%,
      rgba(255, 0, 234, 0.1) 20%,
      transparent 30%,
      rgba(0, 255, 65, 0.15) 50%,
      transparent 70%,
      rgba(255, 0, 234, 0.1) 85%,
      transparent 100%
    );
    animation: ${props => props.active ? glitchClip : 'none'} 0.15s infinite;
  }
  
  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: repeating-linear-gradient(
      0deg,
      transparent,
      transparent 3px,
      rgba(255, 255, 255, 0.03) 3px,
      rgba(255, 255, 255, 0.03) 6px
    );
    animation: ${props => props.active ? glitchClip : 'none'} 0.2s infinite reverse;
  }
`;

const CrtOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  pointer-events: none;
  z-index: 9998;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(0, 0, 0, 0.03) 2px,
    rgba(0, 0, 0, 0.03) 4px
  );
  opacity: ${props => props.active ? 1 : 0.3};
  transition: opacity 0.3s;
`;

const MainLayout = styled.div`
  position: relative;
  z-index: 1;
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const GlassCard = styled.div`
  background: rgba(10, 10, 20, 0.6);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  padding: 20px;
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(0, 255, 65, 0.3), transparent);
  }

  &:hover {
    border-color: rgba(0, 255, 65, 0.3);
    transform: translateY(-2px);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  }
`;

// ============ HEADER ============
const HeaderCard = styled(GlassCard)`
  display: flex;
  flex-direction: column;
  gap: 15px;
  align-items: center;
  text-align: center;
  padding: 25px;

  @media (min-width: 768px) {
    flex-direction: row;
    text-align: left;
    gap: 25px;
  }
`;

const Avatar = styled.div`
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: linear-gradient(135deg, ${theme.green}, ${theme.blue}, ${theme.purple});
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;
  animation: ${float} 3s ease-in-out infinite;
  box-shadow: 0 0 30px rgba(0, 255, 65, 0.2);
`;

const HeaderInfo = styled.div`
  flex: 1;
`;

const Name = styled.h1`
  font-size: 24px;
  font-weight: 700;
  background: linear-gradient(135deg, ${theme.green}, ${theme.blue});
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 8px;

  @media (min-width: 768px) {
    font-size: 32px;
  }
`;

const Tagline = styled.p`
  color: #888;
  font-size: 14px;
  font-family: 'JetBrains Mono', monospace;
`;

const StatusBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 14px;
  border-radius: 20px;
  background: rgba(0, 255, 65, 0.1);
  border: 1px solid rgba(0, 255, 65, 0.2);
  font-size: 12px;
  color: ${theme.green};
  margin-top: 10px;

  &::before {
    content: '';
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: ${theme.green};
    animation: ${pulse} 2s ease-in-out infinite;
  }
`;

// ============ TABS ============
const TabsContainer = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  padding: 4px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 14px;
`;

const Tab = styled.button`
  padding: 10px 18px;
  border-radius: 10px;
  border: none;
  background: ${props => props.active ? 'rgba(0, 255, 65, 0.15)' : 'transparent'};
  color: ${props => props.active ? theme.green : '#888'};
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;

  &:hover {
    color: ${props => props.active ? theme.green : '#ccc'};
    background: ${props => props.active ? 'rgba(0, 255, 65, 0.15)' : 'rgba(255, 255, 255, 0.05)'};
  }
`;


// ============ TERMINAL ============
const TerminalCard = styled.div`
  background: rgba(10, 10, 20, 0.85);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 16px;
  overflow: hidden;
  width: 100%;
  height: ${props => props.isPopup ? 'auto' : '100%'};
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
`;

const TerminalHeader = styled.div`
  display: flex;
  padding: 12px 16px;
  background: rgba(0, 0, 0, 0.3);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  align-items: center;
  gap: 8px;
`;

const Dot = styled.span`
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: ${props => props.color};
  cursor: pointer;
  transition: filter 0.2s;

  &:hover {
    filter: brightness(1.5);
  }
`;

const SoundToggle = styled.button`
  background: ${props => props.$active ? 'rgba(0, 255, 65, 0.15)' : 'rgba(255, 255, 255, 0.05)'};
  border: 1px solid ${props => props.$active ? 'rgba(0, 255, 65, 0.3)' : 'rgba(255, 255, 255, 0.1)'};
  color: ${props => props.$active ? theme.green : '#666'};
  border-radius: 6px;
  padding: 4px 8px;
  font-size: 11px;
  cursor: pointer;
  font-family: 'JetBrains Mono', monospace;
  margin-left: auto;
  transition: all 0.2s;

  &:hover {
    border-color: ${theme.green}40;
    color: ${props => props.$active ? theme.green : '#999'};
  }
`;

const TerminalBody = styled.div`
  padding: 16px;
  max-height: 400px;
  overflow-y: auto;
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  line-height: 1.8;

  @media (min-width: 768px) {
    padding: 24px;
    max-height: 500px;
  }
`;

const SuggestionsBar = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 10px 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  background: rgba(0, 0, 0, 0.15);
`;

const SuggestionChip = styled.button`
  padding: 5px 10px;
  border-radius: 6px;
  border: 1px solid ${props => props.color}30;
  background: ${props => props.color}10;
  color: ${props => props.color};
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;

  &:hover {
    background: ${props => props.color}25;
    border-color: ${props => props.color}60;
    transform: translateY(-1px);
    box-shadow: 0 2px 8px ${props => props.color}20;
  }

  &:active {
    transform: scale(0.95);
  }
`;

const InputLine = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(0, 0, 0, 0.2);
`;

const Prompt = styled.span`
  color: ${theme.green};
  font-weight: 700;
  font-family: 'JetBrains Mono', monospace;
  text-shadow: 0 0 10px rgba(0, 255, 65, 0.3);
  transition: all 0.05s ease;
  
  &.flash {
    color: #fff;
    text-shadow: 0 0 25px rgba(0, 255, 65, 1), 0 0 50px rgba(0, 255, 65, 0.5);
  }
`;

const Input = styled.input`
  background: transparent;
  border: none;
  color: #fff;
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  flex: 1;
  outline: none;
  caret-color: ${theme.green};

  &::placeholder {
    color: #444;
  }
`;

const PreBlock = styled.pre`
  color: ${props => props.color || '#ccc'};
  white-space: pre;
  margin: 4px 0;
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  line-height: 1.5;
  overflow-x: auto;
  
  @media (min-width: 768px) {
    font-size: 11px;
  }
`;

// ============ SKILLS GRID ============
const SkillsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 15px;

  @media (min-width: 768px) {
    grid-template-columns: 1fr 1fr;
  }
`;

const SkillCategory = styled.div`
  background: rgba(255, 255, 255, 0.02);
  border-radius: 14px;
  padding: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
`;

const SkillCategoryTitle = styled.h3`
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  
  &::before {
    content: '';
    width: 3px;
    height: 16px;
    border-radius: 2px;
    background: ${props => props.color};
  }
`;

const SkillTag = styled.span`
  display: inline-block;
  padding: 5px 12px;
  margin: 3px;
  border-radius: 6px;
  background: ${props => props.bg || 'rgba(255,255,255,0.05)'};
  color: ${props => props.color || '#ccc'};
  font-size: 12px;
  font-family: 'JetBrains Mono', monospace;
  border: 1px solid ${props => props.border || 'transparent'};
  transition: all 0.2s;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
  }
`;

// ============ PROJECT CARD ============
const ProjectsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: 15px;

  @media (min-width: 768px) {
    grid-template-columns: 1fr 1fr;
  }
`;

const ProjectCard = styled.a`
  display: block;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  padding: 18px;
  text-decoration: none;
  color: inherit;
  transition: all 0.3s ease;

  &:hover {
    border-color: rgba(0, 255, 65, 0.3);
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 255, 65, 0.1);
  }
`;

const ProjectName = styled.h3`
  font-size: 16px;
  font-weight: 600;
  color: #fff;
  margin-bottom: 6px;
`;

const ProjectDesc = styled.p`
  font-size: 12px;
  color: #888;
  margin-bottom: 10px;
  line-height: 1.5;
`;

const ProjectStats = styled.div`
  display: flex;
  gap: 15px;
  font-size: 11px;
  color: #666;
  font-family: 'JetBrains Mono', monospace;
`;

const LoadingSpinner = styled.div`
  text-align: center;
  padding: 30px;
  color: ${theme.green};
  font-family: 'JetBrains Mono', monospace;
  animation: ${pulse} 1.5s ease-in-out infinite;
`;

// ============ TIMELINE ============
const TimelineContainer = styled.div`
  position: relative;
  padding-left: 30px;

  &::before {
    content: '';
    position: absolute;
    left: 8px;
    top: 0;
    bottom: 0;
    width: 2px;
    background: linear-gradient(to bottom, 
      ${theme.green}, 
      ${theme.blue}, 
      ${theme.purple},
      rgba(255,255,255,0.1)
    );
  }
`;

const TimelineItem = styled.div`
  position: relative;
  margin-bottom: 30px;
  padding-left: 20px;

  &::before {
    content: '';
    position: absolute;
    left: -26px;
    top: 4px;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: ${props => props.color || theme.green};
    border: 2px solid rgba(0,0,0,0.5);
    box-shadow: 0 0 15px ${props => props.color || theme.green}80;
    z-index: 1;
  }
`;

const TimelineYear = styled.div`
  font-size: 11px;
  color: ${props => props.color || theme.green};
  font-family: 'JetBrains Mono', monospace;
  margin-bottom: 4px;
  font-weight: 700;
`;

const TimelineTitle = styled.h3`
  font-size: 15px;
  color: #fff;
  margin-bottom: 4px;
`;

const TimelineDesc = styled.p`
  font-size: 12px;
  color: #888;
  line-height: 1.5;
`;

const TimelineBadge = styled.span`
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 10px;
  font-family: 'JetBrains Mono', monospace;
  background: ${props => props.bg || 'rgba(0,255,65,0.1)'};
  color: ${props => props.color || theme.green};
  border: 1px solid ${props => props.border || 'rgba(0,255,65,0.2)'};
  margin-top: 6px;
`;

// ============ CONTACT ============
const ContactGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;

  @media (min-width: 768px) {
    grid-template-columns: 1fr 1fr 1fr 1fr;
  }
`;

const ContactLink = styled.a`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.08);
  text-decoration: none;
  color: #ccc;
  font-size: 13px;
  transition: all 0.2s;
  font-family: 'JetBrains Mono', monospace;

  &:hover {
    border-color: rgba(0, 255, 65, 0.3);
    color: #fff;
  }
`;

const ContactIcon = styled.span`
  font-size: 18px;
`;

// ============ DATA ============
const profile = {
  name: 'Zalina',
  tagline: 'Student • DevOps Enthusiast • Future Cybersecurity Engineer',
  status: 'Open to opportunities',
  age: 19,
  location: 'Moscow',
  specialization: '09.02.07',
  year: '3rd year',
  
  skills: [
    {
      category: '🛡️ Security',
      color: theme.purple,
      items: ['Network Security', 'OWASP Top 10', 'Wireshark', 'Nmap', 'Cryptography', 'Security Auditing']
    },
    {
      category: '⚙️ DevOps',
      color: theme.blue,
      items: ['Docker', 'CI/CD', 'Linux', 'Bash', 'GitHub Actions', 'Kubernetes']
    },
    {
      category: '💻 Development',
      color: theme.green,
      items: ['Python', 'JavaScript', 'React', 'Flask', 'HTML/CSS', 'REST APIs']
    },
    {
      category: '🔧 Tools',
      color: '#888',
      items: ['Git', 'VS Code', 'Postman', 'Figma', 'Terminal', 'Neovim']
    }
  ],

  contact: {
    github: 'https://github.com/zalina-devops',
    email: 'mailto:z.devops19@proton.me',
    //telegram: 'https://t.me/zalina_devops',
    //linkedin: 'https://linkedin.com/in/zalina-profile'
  }
};
const timeline = [
  {
    year: '2024',
    title: 'Начало пути',
    desc: 'Поступила в Московский колледж на специальность 09.02.07 «Информационная безопасность». Первое знакомство с Linux, сетями и кибербезопасностью.',
    color: theme.green,
    badge: 'Старт'
  },
  {
    year: '2025',
    title: 'Первые проекты',
    desc: 'Освоила Python и Bash. Начала вести GitHub. Запустила первый пет-проект — сканер портов. Изучила основы Docker и CI/CD.',
    color: theme.blue,
    badge: 'GitHub'
  },
  {
    year: '2026',
    title: 'Погружение в DevOps',
    desc: 'Активно изучаю Docker, GitHub Actions, Kubernetes. Углубляюсь в автоматизацию и мониторинг. Участвую в CTF-соревнованиях.',
    color: theme.purple,
    badge: 'Сейчас'
  },
  {
    year: '2027',
    title: 'Диплом и стажировка',
    desc: 'Защита диплома. План: пройти стажировку в DevOps-команде. Получить сертификаты (AWS, Azure, CKA).',
    color: '#ffb86c',
    badge: 'План'
  },
  {
    year: '2028',
    title: 'Университет',
    desc: 'Поступление в вуз на прикладную информатику или кибербезопасность. Совмещение учёбы с работой Junior DevOps Engineer.',
    color: '#ff79c6',
    badge: 'Цель'
  },
  {
    year: '2030',
    title: 'Senior DevOps Engineer',
    desc: 'Цель: стать senior-специалистом. Строить надёжные облачные инфраструктуры. Менторить джуниоров.',
    color: '#8be9fd',
    badge: 'Мечта'
  }
];

// ============ GITHUB API ============
const useGitHubProjects = (username) => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`https://api.github.com/users/${username}/repos?sort=updated&per_page=10`)
      .then(res => res.json())
      .then(data => {
        const formatted = Array.isArray(data) ? data.map(repo => ({
          name: repo.name,
          description: repo.description || 'No description',
          language: repo.language || 'N/A',
          stars: repo.stargazers_count,
          forks: repo.forks_count,
          url: repo.html_url,
        })) : [];
        setProjects(formatted);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [username]);

  return { projects, loading };
};

// ============ HACK GAME ============
const useHackGame = () => {
  const [gameState, setGameState] = useState(null);

  const startGame = useCallback(() => {
    const secretPin = [];
    while (secretPin.length < 4) {
      const digit = Math.floor(Math.random() * 10);
      secretPin.push(digit);
    }
    const code = secretPin.join('');
    
    setGameState({
      secretPin: code,
      attempts: 0,
      maxAttempts: 8,
      hints: [],
      startTime: Date.now(),
    });
    
    console.log('🎮 SECRET CODE:', code); // Для отладки, потом можно удалить
    
    return `
========================================
  MISSION: HACK THE SERVER
========================================
  Find the 4-digit access code.
  You have 8 attempts.

  Hints after each try:
  + = correct digit, correct place
  ? = correct digit, wrong place
  - = digit not in code

  Just type 4 digits and press Enter!
  Type: quit  (to exit game)

  The code changes every game!
========================================

Enter your first guess (4 digits):
    `;
  }, []);

  const checkGuess = useCallback((guess, secret) => {
    // Проверяем каждую позицию
    const result = ['-', '-', '-', '-'];
    const secretArr = secret.split('');
    const guessArr = guess.split('');
    const used = [false, false, false, false];
    
    // Первый проход: точные совпадения
    for (let i = 0; i < 4; i++) {
      if (guessArr[i] === secretArr[i]) {
        result[i] = '+';
        used[i] = true;
      }
    }
    
    // Второй проход: частичные совпадения
    for (let i = 0; i < 4; i++) {
      if (result[i] === '+') continue; // Уже точное совпадение
      
      for (let j = 0; j < 4; j++) {
        if (!used[j] && guessArr[i] === secretArr[j]) {
          result[i] = '?';
          used[j] = true;
          break;
        }
      }
    }
    
    return {
      hint: result.join(''),
      exact: result.filter(r => r === '+').length,
      isWin: result.every(r => r === '+')
    };
  }, []);

  const makeAttempt = useCallback((guess) => {
    if (!gameState) return { output: 'No active game. Type "game" to start.', color: '#ff5555' };

    if (guess === 'quit') {
      setGameState(null);
      return { output: 'Game over. The code was: ' + gameState.secretPin + '. Type "game" to play again.', color: '#ffb86c' };
    }

    if (!/^\d{4}$/.test(guess)) {
      return { output: 'Error: Enter exactly 4 digits.', color: '#ff5555' };
    }

    const newAttempts = gameState.attempts + 1;
    const { hint, exact, isWin } = checkGuess(guess, gameState.secretPin);
    
    if (isWin) {
      const timeElapsed = Math.floor((Date.now() - gameState.startTime) / 1000);
      setGameState(null);

        // Салют!
      confetti({
        particleCount: 200,
        spread: 100,
        origin: { y: 0.6 },
        colors: ['#00ff41', '#4dabf7', '#9775fa', '#ff79c6', '#ffb86c'],
      });
      
      // Второй залп через 0.3 сек
      setTimeout(() => {
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.5, x: 0.3 },
          colors: ['#00ff41', '#4dabf7', '#9775fa'],
        });
      }, 300);
      
      // Третий залп
      setTimeout(() => {
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.5, x: 0.7 },
          colors: ['#ff79c6', '#ffb86c', '#f1fa8c'],
        });
      }, 600);

      return {
        output: `
========================================
  *** ACCESS GRANTED! ***
  Code: ${gameState.secretPin}
  Cracked in ${timeElapsed}s with ${newAttempts} attempts.
  
  Achievement: "First Hack"
  Type "game" to play again.
========================================
        `,
        color: '#50fa7b'
      };
    }

    if (newAttempts >= gameState.maxAttempts) {
      setGameState(null);
      return {
        output: `
========================================
  *** CONNECTION LOST! ***
  Server locked you out.
  The code was: ${gameState.secretPin}
  
  Type "game" to retry.
========================================
        `,
        color: '#ff5555'
      };
    }

    const newHints = [...gameState.hints, { guess, hint, attempt: newAttempts }];
    setGameState({ ...gameState, attempts: newAttempts, hints: newHints });

    const historyStr = newHints.map(h => 
      `  #${h.attempt}: ${h.guess} -> ${h.hint}`
    ).join('\n');

    return {
      output: `
----------------------------------------
  Guess ${newAttempts}/${gameState.maxAttempts}: ${guess} -> ${hint}
----------------------------------------
${historyStr}
----------------------------------------
  Remaining: ${gameState.maxAttempts - newAttempts} attempts
----------------------------------------
      `,
      color: '#8be9fd'
    };
  }, [gameState, checkGuess]);

  return { gameState, startGame, makeAttempt };
};

// ============ PDF RESUME GENERATOR ============
const generateResumePDF = () => {
  import('jspdf').then(({ default: jsPDF }) => {
    const doc = new jsPDF();
    
    // Фон
    doc.setFillColor(10, 10, 15);
    doc.rect(0, 0, 210, 297, 'F');
    
    // Имя — крупно
    doc.setTextColor(0, 255, 65);
    doc.setFont('Courier', 'Bold');
    doc.setFontSize(28);
    doc.text('ZALINA', 105, 30, { align: 'center' });
    
    // Линия
    doc.setDrawColor(0, 255, 65);
    doc.setLineWidth(0.5);
    doc.line(20, 38, 190, 38);
    
    // Контакты — мелко
    doc.setFontSize(10);
    doc.setFont('Courier', 'Normal');
    doc.setTextColor(200, 200, 200);
    doc.text('GitHub: github.com/zalina-devops', 105, 50, { align: 'center' });
    doc.text('Email: z.devops19@proton.me', 105, 57, { align: 'center' });
    doc.text('Location: Moscow, Russia', 105, 64, { align: 'center' });
    
    // Образование
    doc.setFontSize(14);
    doc.setFont('Courier', 'Bold');
    doc.setTextColor(77, 171, 247);
    doc.text('EDUCATION', 20, 80);
    doc.setDrawColor(77, 171, 247);
    doc.line(20, 83, 190, 83);
    
    doc.setFontSize(10);
    doc.setFont('Courier', 'Normal');
    doc.setTextColor(220, 220, 220);
    doc.text('Moscow State College', 20, 93);
    doc.setTextColor(180, 180, 180);
    doc.text('Specialization: 09.02.07 — Information Systems Security', 20, 100);
    doc.text('Year: 3rd (2 years remaining)', 20, 107);
    doc.text('Goal: University enrollment in Applied Informatics (2028)', 20, 114);
    
    // Навыки
    doc.setFontSize(14);
    doc.setFont('Courier', 'Bold');
    doc.setTextColor(151, 117, 250);
    doc.text('SKILLS', 20, 132);
    doc.setDrawColor(151, 117, 250);
    doc.line(20, 135, 190, 135);
    
    const skills = [
      { category: 'Security', items: 'Network Security, OWASP Top 10, Wireshark, Nmap' },
      { category: 'DevOps', items: 'Docker, CI/CD, Linux, Bash, GitHub Actions' },
      { category: 'Development', items: 'Python, JavaScript, React, Flask, HTML/CSS' },
      { category: 'Tools', items: 'Git, VS Code, Postman, Figma, Terminal' }
    ];
    
    let y = 145;
    skills.forEach(({ category, items }) => {
      doc.setFont('Courier', 'Bold');
      doc.setFontSize(10);
      doc.setTextColor(200, 200, 200);
      doc.text(category + ':', 20, y);
      doc.setFont('Courier', 'Normal');
      doc.setTextColor(180, 180, 180);
      doc.text(items, 55, y);
      y += 8;
    });
    
    // Подвал
    doc.setFontSize(8);
    doc.setFont('Courier', 'Normal');
    doc.setTextColor(100, 100, 100);
    doc.text('Generated from portfolio-kernel.vercel.app', 105, 280, { align: 'center' });
    
    doc.save('Zalina_Resume.pdf');
  });
};

// ============ COMMANDS ============
const createCommands = (projects, projectsLoading, startGame, makeAttempt) => ({
  game: (input) => {
    const parts = input.trim().split(/\s+/);
    const subCommand = parts[1] || '';
    
    // Просто "game" — запуск
    if (!subCommand) {
      const output = startGame();
      return { output, color: '#50fa7b' };
    }
    
    // "game quit" — выход
    if (subCommand === 'quit') {
      return makeAttempt('quit');
    }
    
    // "game 1234" — попытка
    if (/^\d{4}$/.test(subCommand)) {
      return makeAttempt(subCommand);
    }
    
    return { output: 'Usage: game 1234 (4 digits) or game quit', color: '#ff5555' };
  },

  help: (input) => {
    const topic = input?.trim().split(/\s+/)[1];
    
    if (topic === 'game') {
      return {
        output: `
╔══════════════════════════════╗
║  GAME: HACK THE SERVER       ║
╠══════════════════════════════╣
║  You are a hacker. Goal:     ║
║  crack the 4-digit code.     ║
║                              ║
║  Commands:                   ║
║  game         start game     ║
║  game 1234    make guess     ║
║  game quit    exit game      ║
║                              ║
║  Hints after each try:       ║
║  + = correct digit & place   ║
║  ~ = digit exists, wrong pos ║
║  - = wrong digit             ║
║                              ║
║  8 attempts to hack!         ║
║  Good luck, hacker!          ║
╚══════════════════════════════╝
        `,
        color: '#ff79c6'
      };
    }

    return {
      output: `
╔══════════════════════════════╗
║  AVAILABLE COMMANDS          ║
╠══════════════════════════════╣
║  whoami      About me        ║
║  skills      Tech skills     ║
║  projects    GitHub repos    ║
║  education   Academic path   ║
║  contact     Get in touch    ║
║  clear       Clear terminal  ║
║  matrix      ???             ║
║  coffee      Emergency fuel  ║
║  stats       Some numbers    ║
║  game        Hack server     ║
║  help game   Game rules      ║
╚══════════════════════════════╝
      `,
      color: '#ffb86c'
    };
  },

  whoami: () => ({
    output: `
╔══════════════════════════════╗
║  ${profile.name}                        ║
║  ${profile.age} y.o. | ${profile.location}           ║
╠══════════════════════════════╣
║  Student @ Moscow College    ║
║  Specialization: 09.02.07   ║
║  ${profile.year}                    ║
║                              ║
║  Goal: Applied Informatics   ║
║  (Cybersecurity Engineering) ║
╚══════════════════════════════╝

> "${profile.tagline}"
    `,
    color: theme.purple
  }),

  skills: () => {
    const allSkills = profile.skills.map(cat => 
      `[${cat.category}]\n${cat.items.map(s => `  * ${s}`).join('\n')}`
    ).join('\n\n');
    
    return {
      output: `>>> SCANNING SKILL TREE...\n\n${allSkills}`,
      color: theme.blue
    };
  },

  projects: () => {
    if (projectsLoading) return { output: '>>> FETCHING FROM GitHub...', color: theme.green };
    if (projects.length === 0) return { output: 'No public repositories found.', color: '#ff5555' };

    const list = projects.map((p, i) => 
      `[${i + 1}] ${p.name}\n   ${p.description}\n   Stars: ${p.stars}  Forks: ${p.forks}  Lang: ${p.language}\n   ${p.url}`
    ).join('\n\n');

    return {
      output: `>>> LIVE DATA FROM github.com/zalina-devops\n>>> Found ${projects.length} repositories\n\n${list}`,
      color: theme.green
    };
  },

  education: () => ({
    output: `
╔══════════════════════════════╗
║  CURRENT: Moscow College     ║
║  Program: 09.02.07           ║
║  Status: 3rd year (2y left)  ║
║                              ║
║  GOAL: University Enrollment ║
║  Target: Applied Informatics ║
║  Year: 2028                  ║
╚══════════════════════════════╝
    `,
    color: '#f1fa8c'
  }),

  contact: () => ({
    output: `
>>> ESTABLISHING CONNECTION...

  Email:    z.devops19@proton.me
  GitHub:   github.com/zalina-devops
  Telegram: t.me/zalina_devops
  LinkedIn: linkedin.com/in/zalina-profile

  PGP Key available on request.
    `,
    color: '#ff79c6'
  }),

  stats: () => ({
    output: `
╔══════════════════════════════╗
║  PORTFOLIO STATISTICS        ║
╠══════════════════════════════╣
║  Coffee consumed: infinite   ║
║  Lines of code: counting...  ║
║  Bugs fixed: countless       ║
║  Hours learning: 1000+       ║
║  Projects shipped: ${String(projects.length).padEnd(9)} ║
║                              ║
║  "Measuring in commits,      ║
║   not in years."             ║
╚══════════════════════════════╝
    `,
    color: '#ffb86c'
  }),

  resume: () => {
    generateResumePDF();
    return {
      output: '>>> Generating PDF resume... Check your downloads!',
      color: '#50fa7b'
    };
  },

  matrix: () => ({
    output: 'Wake up, Neo... The Matrix has you...',
    color: '#00ff41',
    special: 'matrix'
  }),

  coffee: () => ({
    output: 'Coffee injected. Resuming hacking...',
    color: '#ffb86c'
  }),

  sudo: () => ({
    output: 'Permission denied: Nice try though ;)',
    color: '#ff5555'
  }),

  sound: () => ({
    output: 'Use the speaker button in terminal header to toggle sound.',
    color: '#ffb86c',
    special: 'toggleSound'
  })
});

// ============ NEURAL NETWORK BACKGROUND ============
const NeuralNetwork = () => {
  const canvasRef = useRef(null);
  const mouseRef = useRef({ x: -1000, y: -1000 });

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();

    // Частицы
    const particleCount = 80;
    const particles = [];
    
    class Particle {
      constructor() {
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.vx = (Math.random() - 0.5) * 0.5;
        this.vy = (Math.random() - 0.5) * 0.5;
        this.size = Math.random() * 2 + 1;
        this.color = ['#00ff41', '#4dabf7', '#9775fa'][Math.floor(Math.random() * 3)];
      }
      
      update() {
        this.x += this.vx;
        this.y += this.vy;
        
        // Отскок от краёв
        if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
        if (this.y < 0 || this.y > canvas.height) this.vy *= -1;
        
        // Лёгкое притяжение к мыши
        const dx = mouseRef.current.x - this.x;
        const dy = mouseRef.current.y - this.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 200) {
          this.vx += dx / dist * 0.02;
          this.vy += dy / dist * 0.02;
        }
      }
      
      draw(ctx) {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.shadowBlur = 8;
        ctx.shadowColor = this.color;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }
    
    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle());
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Рисуем связи
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          if (dist < 150) {
            const opacity = 1 - dist / 150;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(0, 255, 65, ${opacity * 0.1})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
      
      // Обновляем и рисуем частицы
      particles.forEach(p => {
        p.update();
        p.draw(ctx);
      });
    };

    const animate = () => {
      draw();
      requestAnimationFrame(animate);
    };

    const handleMouseMove = (e) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const animationId = requestAnimationFrame(animate);
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        opacity: 0.6,
        pointerEvents: 'none',
      }}
    />
  );
};

// ============ MATRIX RAIN ============
const MatrixRain = ({ active }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();

    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789ｦｱｳｴｵｶｷｹｺｻｼｾｿﾀﾂﾃﾅﾆﾇﾈﾊﾋﾎﾏﾐﾑﾒﾓﾔﾕﾗﾘﾜ';
    const fontSize = 14;
    const columns = canvas.width / fontSize;
    const drops = Array(Math.floor(columns)).fill(1);

    const draw = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#0F0';
      ctx.font = `${fontSize}px monospace`;

      for (let i = 0; i < drops.length; i++) {
        const text = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillText(text, i * fontSize, drops[i] * fontSize);

        if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
    };

    const interval = setInterval(draw, 33);
    window.addEventListener('resize', resize);

    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 0,
        opacity: active ? 0.3 : 0,
        transition: 'opacity 1.5s ease',
        pointerEvents: 'none',
      }}
    />
  );
};

// ============ TERMINAL ============
const Terminal = ({ onSpecialCommand, projects, projectsLoading, keyboardSound, isPopup = false, gameProps }) => {
  const commands = createCommands(projects, projectsLoading, gameProps?.startGame, gameProps?.makeAttempt);
  const [history, setHistory] = useState([]);
  const [currentInput, setCurrentInput] = useState('');
  const [inputHistory, setInputHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [promptFlash, setPromptFlash] = useState(false);
  const [glitchActive, setGlitchActive] = useState(false);
  const [typedWelcome, setTypedWelcome] = useState('');
const [showCursor, setShowCursor] = useState(true);

const welcomeText = `> Kernel v19.07.2026 | Uptime: 19 years
> Specialization: 09.02.07 | Node: Moscow
> Type 'help' to explore.
> Click anywhere + type = sound!
> Drag header to move window!`;

useEffect(() => {
    let i = 0;
    const typeInterval = setInterval(() => {
      if (i < welcomeText.length) {
        setTypedWelcome(welcomeText.slice(0, i + 1));
        i++;
      } else {
        clearInterval(typeInterval);
      }
    }, 15);
    
    const blinkInterval = setInterval(() => setShowCursor(prev => !prev), 500);
    
    return () => {
      clearInterval(typeInterval);
      clearInterval(blinkInterval);
    };
  }, []);
  const [isMinimized, setIsMinimized] = useState(false);
  const inputRef = useRef(null);
  const bodyRef = useRef(null);

  const quickCommands = [
    { cmd: 'help', label: '📋 help', color: '#ffb86c', desc: 'Все команды' },
    { cmd: 'whoami', label: '👤 whoami', color: theme.purple, desc: 'Обо мне' },
    { cmd: 'skills', label: '⚡ skills', color: theme.blue, desc: 'Навыки' },
    { cmd: 'projects', label: '📦 projects', color: theme.green, desc: 'Проекты' },
    { cmd: 'education', label: '🎓 education', color: '#f1fa8c', desc: 'Учёба' },
    { cmd: 'timeline', label: '🛤️ timeline', color: '#ff79c6', desc: 'Мой путь' },
    { cmd: 'contact', label: '📬 contact', color: '#ffb86c', desc: 'Контакты' },
	{ cmd: 'resume', label: '📄 resume', color: '#50fa7b', desc: 'Скачать PDF-резюме' },
    { cmd: 'matrix', label: '🌧️ matrix', color: '#00ff41', desc: 'Пасхалка' },
    { cmd: 'game', label: '🎮 game', color: '#8be9fd', desc: 'Взломай сервер (8 попыток)' },
  ];

  useEffect(() => {
    if (!isPopup) {
      inputRef.current?.focus();
    }
  }, [isPopup]);

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [history]);

  const executeCommand = useCallback((input) => {
    const trimmed = input.trim();
    const cmd = trimmed.toLowerCase();
    
    setHistory(prev => [...prev, { type: 'command', text: `❯ ${input}` }]);

    if (cmd === 'clear') {
      setHistory([]);
      return null;
    }

    // Если игра активна и ввод — quit
    if (gameProps?.gameState && cmd === 'quit') {
      const result = gameProps.makeAttempt('quit');
      setHistory(prev => [...prev, { type: 'output', text: result.output, color: result.color }]);
      return result;
    }

    // Если игра активна и ввод — 4 цифры, отправляем в игру
    if (gameProps?.gameState && /^\d{4}$/.test(trimmed)) {
      const result = gameProps.makeAttempt(trimmed);
      setHistory(prev => [...prev, { type: 'output', text: result.output, color: result.color }]);
      return result;
    }

    // Разбираем команду и аргументы
    const parts = cmd.split(/\s+/);
    const mainCmd = parts[0];
    const handler = commands[mainCmd];
    
    if (handler) {
      let result;
      
      if (mainCmd === 'game' || mainCmd === 'help') {
        result = handler(input);
      } else {
        result = handler();
      }
      
      setHistory(prev => [...prev, { type: 'output', text: result.output, color: result.color }]);
      return result;
    } else if (cmd !== '') {
      setGlitchActive(true);
      setTimeout(() => setGlitchActive(false), 600);
      
      setHistory(prev => [...prev, {
        type: 'output',
        text: `command not found: ${cmd}. Type 'help' for options.${gameProps?.gameState ? '\nTip: Just type 4 digits to guess the code!' : ''}`,
        color: '#ff5555'
      }]);
    }
    
    return null;
  }, [commands, gameProps]);

  const handleCommand = (e) => {
    if (e.key !== 'Enter') return;
    
    keyboardSound.playEnterSound();
    setPromptFlash(true);
    setTimeout(() => setPromptFlash(false), 100);
    
    const input = currentInput.trim();
    if (input) {
      setInputHistory(prev => [...prev, input]);
      setHistoryIndex(-1);
      
      const result = executeCommand(input);
      if (result?.special === 'matrix') {
        onSpecialCommand?.('matrix');
      }
      if (result?.special === 'toggleSound') {
        keyboardSound.toggleSound();
      }
    }
    
    setCurrentInput('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      keyboardSound.playKeySound();
      if (inputHistory.length > 0) {
        const newIndex = historyIndex === -1 ? inputHistory.length - 1 : Math.max(0, historyIndex - 1);
        setHistoryIndex(newIndex);
        setCurrentInput(inputHistory[newIndex] || '');
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      keyboardSound.playKeySound();
      if (historyIndex !== -1) {
        const newIndex = historyIndex + 1;
        if (newIndex >= inputHistory.length) {
          setHistoryIndex(-1);
          setCurrentInput('');
        } else {
          setHistoryIndex(newIndex);
          setCurrentInput(inputHistory[newIndex] || '');
        }
      }
    }
  };

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    if (newValue.length > currentInput.length) {
      keyboardSound.playKeySound();
      setPromptFlash(true);
      setTimeout(() => setPromptFlash(false), 60);
    }
    if (newValue.length < currentInput.length) {
      keyboardSound.playBackspaceSound();
      setPromptFlash(true);
      setTimeout(() => setPromptFlash(false), 60);
    }
    setCurrentInput(newValue);
  };

  const terminalContent = (
    <TerminalCard isPopup={isPopup}>
      <TerminalHeader>
        <Dot color="#ff5f56" onClick={() => executeCommand('clear')} title="Clear terminal" />
        <Dot color="#ffbd2e" onClick={() => setIsMinimized(!isMinimized)} title={isMinimized ? 'Expand' : 'Minimize'} />
        <Dot color="#27c93f" onClick={() => onSpecialCommand?.('float')} title="Pop out window" />
        <span style={{ marginLeft: '10px', fontSize: '12px', color: '#666', fontFamily: 'JetBrains Mono' }}>
          zalina@kernel:~/portfolio
        </span>
        <SoundToggle 
          $active={keyboardSound.soundEnabled} 
          onClick={keyboardSound.toggleSound}
          title={keyboardSound.soundEnabled ? 'Sound ON' : 'Sound OFF'}
        >
          {keyboardSound.soundEnabled ? '🔊' : '🔇'}
        </SoundToggle>
      </TerminalHeader>
      
      {!isMinimized && <>
      <TerminalBody ref={bodyRef}>
        <div style={{ textAlign: 'center', overflow: 'hidden' }}>
        <PreBlock color="#6272a4" style={{ display: 'inline-block', textAlign: 'left' }}>
{`
 ███████╗ █████╗ ██╗     ██╗███╗   ██╗ █████╗ 
 ╚══███╔╝██╔══██╗██║     ██║████╗  ██║██╔══██╗
   ███╔╝ ███████║██║     ██║██╔██╗ ██║███████║
  ███╔╝  ██╔══██║██║     ██║██║╚██╗██║██╔══██║
 ███████╗██║  ██║███████╗██║██║ ╚████║██║  ██║
 ╚══════╝╚═╝  ╚═╝╚══════╝╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝
`}
        </PreBlock>
      </div>
        
        <PreBlock color="#6272a4">
          {typedWelcome}
          <span style={{ opacity: showCursor ? 1 : 0, color: '#00ff41' }}>_</span>
        </PreBlock>

        {history.map((item, index) => (
          <div key={index}>
            {item.type === 'command' ? (
              <PreBlock color="#f8f8f2">{item.text}</PreBlock>
            ) : (
              <PreBlock color={item.color}>{item.text}</PreBlock>
            )}
          </div>
        ))}
      </TerminalBody>

      <SuggestionsBar>
        {quickCommands.map((item) => (
         <SuggestionChip
            key={item.cmd}
            color={item.color}
            onClick={() => {
                setCurrentInput(item.cmd);
                inputRef.current?.focus();
            }}
            title={item.desc}
          >
            {item.label}
        </SuggestionChip>
        ))}
      </SuggestionsBar>
      </>}

      <InputLine>
        <Prompt className={promptFlash ? 'flash' : ''}>❯</Prompt>
        <Input
          ref={inputRef}
          type="text"
          value={currentInput}
          onChange={handleInputChange}
          onKeyDown={(e) => {
            handleKeyDown(e);
            if (e.key === 'Enter') handleCommand(e);
          }}
          spellCheck={false}
          autoComplete="off"
          placeholder="type command..."
        />
      </InputLine>
    </TerminalCard>
  );

	useEffect(() => {
	  if (glitchActive) {
		console.log('📡 SENDING GLITCH TO APP');
		onSpecialCommand?.('glitch');
	  }
	}, [glitchActive]);

  return terminalContent;
};

// ============ DRAGGABLE TERMINAL WRAPPER ============
const DraggableTerminal = ({ onSpecialCommand, projects, projectsLoading, keyboardSound, gameProps }) => {
  const [isFloating, setIsFloating] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef({ startX: 0, startY: 0, startPosX: 0, startPosY: 0 });
  const containerRef = useRef(null);

  const handleToggleFloat = () => {
    if (!isFloating) {
      setPosition({
        x: Math.max(0, (window.innerWidth - 800) / 2),
        y: Math.max(0, (window.innerHeight - 500) / 2),
      });
    }
    setIsFloating(!isFloating);
  };

  const handleMouseDown = (e) => {
    if (!isFloating) return;
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON' || e.target.closest('button')) return;
    
    e.preventDefault();
    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startPosX: position.x,
      startPosY: position.y,
    };
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e) => {
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      setPosition({
        x: Math.max(0, Math.min(window.innerWidth - 820, dragRef.current.startPosX + dx)),
        y: Math.max(0, Math.min(window.innerHeight - 100, dragRef.current.startPosY + dy)),
      });
    };

    const handleMouseUp = () => setIsDragging(false);

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const handleTouchStart = (e) => {
    if (!isFloating) return;
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON' || e.target.closest('button')) return;
    
    const touch = e.touches[0];
    setIsDragging(true);
    dragRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      startPosX: position.x,
      startPosY: position.y,
    };
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleTouchMove = (e) => {
      const touch = e.touches[0];
      const dx = touch.clientX - dragRef.current.startX;
      const dy = touch.clientY - dragRef.current.startY;
      setPosition({
        x: Math.max(0, Math.min(window.innerWidth - 820, dragRef.current.startPosX + dx)),
        y: Math.max(0, Math.min(window.innerHeight - 100, dragRef.current.startPosY + dy)),
      });
    };

    const handleTouchEnd = () => setIsDragging(false);

    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
    return () => {
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isDragging]);

  return (
    <div ref={containerRef}>
      <div style={{ marginBottom: '8px' }}>
        <button
          onClick={handleToggleFloat}
          style={{
            padding: '6px 14px',
            background: isFloating ? 'rgba(0,255,65,0.15)' : 'rgba(255,255,255,0.03)',
            border: `1px solid ${isFloating ? 'rgba(0,255,65,0.4)' : 'rgba(255,255,255,0.1)'}`,
            borderRadius: '8px',
            color: isFloating ? theme.green : '#888',
            fontSize: '12px',
            fontFamily: 'JetBrains Mono',
            cursor: 'pointer',
          }}
        >
          {isFloating ? '📌 Закрепить обратно' : '🖱️ Открепить'}
        </button>
      </div>

      {isFloating && <div style={{ height: '400px' }} />}
      
      <div
        style={{
          position: isFloating ? 'fixed' : 'relative',
          left: isFloating ? `${position.x}px` : '0',
          top: isFloating ? `${position.y}px` : '0',
          width: isFloating ? '800px' : '100%',
          maxWidth: '100%',
          zIndex: isFloating ? 1000 : 1,
          cursor: isDragging ? 'grabbing' : isFloating ? 'grab' : 'default',
          transition: isDragging ? 'none' : 'box-shadow 0.3s',
          boxShadow: isFloating ? '0 20px 60px rgba(0,0,0,0.6), 0 0 40px rgba(0,255,65,0.1)' : 'none',
          borderRadius: '16px',
        }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        <Terminal
            onSpecialCommand={(cmd) => {
              if (cmd === 'float') handleToggleFloat();
              else onSpecialCommand?.(cmd);
            }}
            projects={projects}
            projectsLoading={projectsLoading}
            keyboardSound={keyboardSound}
            gameProps={gameProps}
            isPopup={true}
        />
      </div>
    </div>
  );
};

// ============ MAIN APP ============
function App() {
  const [activeTab, setActiveTab] = useState('terminal');
  const [matrixActive, setMatrixActive] = useState(false);
  const [glitchActive, setGlitchActive] = useState(false);
  const { projects, loading: projectsLoading } = useGitHubProjects('zalina-devops');
  const keyboardSound = useKeyboardSound();
  const gameHook = useHackGame();


  const handleSpecialCommand = (special) => {
    if (special === 'matrix') {
      setMatrixActive(true);
      setTimeout(() => setMatrixActive(false), 10000);
    }
    if (special === 'glitch') {
      console.log('💥 GLITCH RECEIVED IN APP'); // ← ДОБАВЬ
      setGlitchActive(true);
      setTimeout(() => setGlitchActive(false), 700);
    }
  };

  const tabs = [
    { id: 'terminal', label: '>_ Terminal' },
    { id: 'timeline', label: '🛤️ Timeline' },
    { id: 'skills', label: '⚡ Skills' },
    { id: 'projects', label: '📦 Projects' },
    { id: 'contact', label: '📬 Contact' },
  ];

  return (
    <>
      <GlobalStyles />
      <AppContainer>
		<NeuralNetwork />
		<MatrixRain active={matrixActive} />
		<GlitchOverlay active={glitchActive} />
		<CrtOverlay active={matrixActive} />
		
		
        <MainLayout>
          {/* HEADER */}
          <HeaderCard>
            <Avatar>Z</Avatar>
            <HeaderInfo>
              <Name>{profile.name}</Name>
              <Tagline>{profile.tagline}</Tagline>
              <StatusBadge>{profile.status}</StatusBadge>
            </HeaderInfo>
          </HeaderCard>

          {/* TABS */}
          <GlassCard>
            <TabsContainer>
              {tabs.map(tab => (
                <Tab
                  key={tab.id}
                  active={activeTab === tab.id}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                </Tab>
              ))}
            </TabsContainer>
          </GlassCard>

          {/* CONTENT */}
          {activeTab === 'terminal' && <DraggableTerminal 
            onSpecialCommand={handleSpecialCommand}
            projects={projects}
            projectsLoading={projectsLoading}
            keyboardSound={keyboardSound}
            gameProps={gameHook}
         />}
          {activeTab === 'timeline' && (
            <GlassCard>
                <TimelineContainer>
                {timeline.map((item, i) => (
                    <TimelineItem key={i} color={item.color}>
                    <TimelineYear color={item.color}>{item.year}</TimelineYear>
                    <TimelineTitle>{item.title}</TimelineTitle>
                    <TimelineDesc>{item.desc}</TimelineDesc>
                    <TimelineBadge 
                        bg={`${item.color}15`} 
                        color={item.color}
                        border={`${item.color}30`}
                    >
                        {item.badge}
                    </TimelineBadge>
                    </TimelineItem>
                ))}
                </TimelineContainer>
            </GlassCard>
            )}


          {activeTab === 'skills' && (
            <GlassCard>
              <SkillsGrid>
                {profile.skills.map((cat, i) => (
                  <SkillCategory key={i}>
                    <SkillCategoryTitle color={cat.color}>
                      {cat.category}
                    </SkillCategoryTitle>
                    <div>
                      {cat.items.map((skill, j) => (
                        <SkillTag 
                          key={j}
                          bg={`${cat.color}15`}
                          color={cat.color}
                          border={`${cat.color}30`}
                        >
                          {skill}
                        </SkillTag>
                      ))}
                    </div>
                  </SkillCategory>
                ))}
              </SkillsGrid>
            </GlassCard>
          )}

          {activeTab === 'projects' && (
            <GlassCard>
              {projectsLoading ? (
                <LoadingSpinner>⏳ Loading projects from GitHub...</LoadingSpinner>
              ) : (
                <ProjectsGrid>
                  {projects.map((project, i) => (
                    <ProjectCard key={i} href={project.url} target="_blank" rel="noopener">
                      <ProjectName>📦 {project.name}</ProjectName>
                      <ProjectDesc>{project.description}</ProjectDesc>
                      <ProjectStats>
                        <span>⭐ {project.stars}</span>
                        <span>🍴 {project.forks}</span>
                        <span>🔤 {project.language}</span>
                      </ProjectStats>
                    </ProjectCard>
                  ))}
                </ProjectsGrid>
              )}
            </GlassCard>
          )}

          {activeTab === 'contact' && (
            <GlassCard>
              <ContactGrid>
                <ContactLink href={profile.contact.github} target="_blank">
                  <ContactIcon>🐙</ContactIcon>
                  GitHub
                </ContactLink>
                <ContactLink href={profile.contact.email}>
                  <ContactIcon>📧</ContactIcon>
                  Email
                </ContactLink>
                <ContactLink href={profile.contact.telegram} target="_blank">
                  <ContactIcon>💬</ContactIcon>
                  Telegram
                </ContactLink>
                <ContactLink href={profile.contact.linkedin} target="_blank">
                  <ContactIcon>🔗</ContactIcon>
                  LinkedIn
                </ContactLink>
              </ContactGrid>
            </GlassCard>
          )}
        </MainLayout>
      </AppContainer>
    </>
  );
}

export default App;