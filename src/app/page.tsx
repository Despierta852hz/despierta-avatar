"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Message as MessageProps, useChat } from "ai/react";
import Form from "@/components/form";
import Message from "@/components/message";
import cx from "@/utils/cx";
import PoweredBy from "@/components/powered-by";
import MessageLoading from "@/components/message-loading";
import { INITIAL_QUESTIONS } from "@/utils/const";
import ResponseMessage from "@/components/response-message";
import { getTokenOrRefresh } from '../utils/token_util';
import { SpeechRecognizer, SpeechConfig, AudioConfig, ResultReason, SpeechSynthesizer } from 'microsoft-cognitiveservices-speech-sdk'; // Añadimos SpeechSynthesizer
import { BiMicrophone } from "react-icons/bi";
import { BsFillStopCircleFill } from "react-icons/bs";
import { useSearchParams } from 'next/navigation'
const speechsdk = require('microsoft-cognitiveservices-speech-sdk');
import { marked } from 'marked';
import he from 'he';

const saveMessages = (messages: any) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('chatMessages', JSON.stringify(messages));
  }
};

const loadMessages = () => {
  if (typeof window !== 'undefined') {
    const messages = localStorage.getItem('chatMessages');
    return messages ? JSON.parse(messages) : [];
  }
};

const handleReset = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('chatMessages');
    window.location.reload(); // This will reload the page to reset the state
  }
};

export default function Home() {
  const [randqst, setRandqst] = useState(Math.floor(Math.random() * 11));
  const searchParams = useSearchParams()
  const search = searchParams.get('name')
  let name: string = ""; // Initialize the variable

  if (search) {
    name = search;
  } else {
    name = "";
  }
  const [language, setLanguage] = useState<string | null>(null);
  const [showLanguageDialog, setShowLanguageDialog] = useState<boolean>(false);

  const [recognizer, setRecognizer] = useState<SpeechRecognizer | null>(null);
  const [avatarState, setAvatarState] = useState("waiting");
  const formRef = useRef<HTMLFormElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [streaming, setStreaming] = useState<boolean>(false);
  const [audioPlayer, setAudioPlayer] = useState<HTMLAudioElement | null>(null);
  const [visemes, setVisemes] = useState<any>(null);
  const [showChat, setShowChat] = useState<boolean>(false);
  const [response, setResponse] = useState("Hola, ¿cómo estás? Soy Zen, tu guía personal en Despierta.online, aquí para ayudarte con bienestar y desarrollo personal: Espiritualidad, Cursos y Talleres, Desarrollo Personal, Productos, Esoterismo y Oráculos, y Eventos en Vivo. ¿Cómo puedo asistirte hoy?");
  const [count, setCount] = useState(0);
  const [displayText, setDisplayText] = useState('INITIALIZED: ready to test speech...');
  const [recording, setRecording] = useState("not yet");
  const { messages, input, handleInputChange, handleSubmit, setInput } =
    useChat({
      api: "/api/guru",
      initialMessages: loadMessages()?.length ? loadMessages() : [
        {
          id: "0",
          role: "system",
          content: `
**Welcome to Despierta**

how are you? I'm Zen, your personal guide at Despierta.online. I'm here to guide you on various topics and help you find what you need for your well-being and personal development. How can I assist you today?Here are some options to get started:Spirituality: Learn about spiritual practices and how you can elevate your consciousness.Courses and Workshops: Discover our variety of courses and workshops on well-being, spirituality, and personal development.Personal Development: Find tools and resources to improve different aspects of your life.Products: Explore our products designed to help you on your path to growth and well-being.Esotericism and Oracles: Check out our live tarot sessions and other esoteric services.Live Events: Connect with our upcoming live events and sessions.Select one of the options to dive deeper into the topic that interests you most
          `,
        },
      ],
      onResponse: () => {
        setStreaming(false);
        saveMessages(messages);
      },

    });


  const stopAudioPlayer = () => {
    if (audioPlayer) {
      audioPlayer.pause();
      audioPlayer.currentTime = 0;
      setAudioPlayer(null);
      setAvatarState("waiting");
    }
  };

  async function sttFromMic() {
    console.log(language)
    if (recognizer) {

      recognizer.stopContinuousRecognitionAsync(
        () => {
          console.log("Recognition stopped.");
          setRecording("not yet");
          setAvatarState("waiting");
          setRecognizer(null);
          setDisplayText('Audio Recognition stopped');

        },
        (err) => {
          console.error("Error stopping recognition:", err);
        }
      );
      return;
    }

    try {
      const tokenObj = await getTokenOrRefresh();
      await navigator.mediaDevices.getUserMedia({ audio: true });

      const speechConfig = SpeechConfig.fromAuthorizationToken(tokenObj.authToken, tokenObj.region);
      speechConfig.speechRecognitionLanguage = "en-US";

      const audioConfig = AudioConfig.fromDefaultMicrophoneInput();
      const newRecognizer = new SpeechRecognizer(speechConfig, audioConfig);
      setRecognizer(newRecognizer);

      setDisplayText('Speak into your microphone...');
      setAvatarState("listening");
      setRecording("recording");

      newRecognizer.recognizeOnceAsync((result) => {
        if (result.reason === ResultReason.RecognizedSpeech) {
          setDisplayText(`You said: ${result.text}`);
          setRecording("not yet");
          setInput(result.text);
          setTimeout(() => {
            formRef.current?.dispatchEvent(
              new Event("submit", {
                cancelable: true,
                bubbles: true,
              })
            );
          }, 500);
        } else {
          setAvatarState("waiting");
          setRecognizer(null);
          setDisplayText('ERROR: Speech was cancelled or could not be recognized. Ensure your microphone is working properly.');
          setRecording("failed");
        }
      }, (error) => {
        console.error("Error recognizing speech:", error);
        setDisplayText('ERROR: Speech recognition failed.');
        setRecording("failed");
      });
    } catch (error) {
      console.error("Error initializing speech recognizer:", error);
      setDisplayText('ERROR: Initialization failed. Please try again.');
      setRecording("failed");
    }
  }

  // Cambiamos solo la voz de la síntesis de voz a "es-MX-DaliaNeural"
  const fetchTTS = async (text: string) => {
    try {
      if (audioPlayer) {
        audioPlayer.pause();
        audioPlayer.currentTime = 0;
        setAudioPlayer(null);
      }
      const htmlText = marked(text) as string;
      // Decode HTML entities
      const decodedHtml = he.decode(htmlText);
      // Strip HTML tags to get plain text
      const plainText = decodedHtml.replace(/<[^>]+>/g, '');
      console.log("plain text : " + plainText);

      // Aquí hacemos el cambio para la voz en español de México
      const tokenObj = await getTokenOrRefresh();
      const speechConfig = SpeechConfig.fromAuthorizationToken(tokenObj.authToken, tokenObj.region);
      speechConfig.speechSynthesisVoiceName = "es-MX-DaliaNeural"; // Cambiamos la voz a "es-MX-DaliaNeural"
      
      const audioConfig = AudioConfig.fromDefaultSpeakerOutput();
      const synthesizer = new SpeechSynthesizer(speechConfig, audioConfig);

      synthesizer.speakTextAsync(plainText, result => {
        if (result.reason === ResultReason.SynthesizingAudioCompleted) {
          console.log("Síntesis completada.");
        } else {
          console.error(`Error en la síntesis de voz: ${result.errorDetails}`);
        }
        synthesizer.close();
      }, error => {
        console.error("Error durante la síntesis de voz:", error);
        synthesizer.close();
      });

    } catch (error) {
      console.error("Error fetching TTS:", error);
    }
  };

  const onClickQuestion = (value: string) => {
    setInput(value);
    setTimeout(() => {
      formRef.current?.dispatchEvent(
        new Event("submit", {
          cancelable: true,
          bubbles: true,
        })
      );
    }, 1);
  };

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView();
    }
    saveMessages(messages);
  }, [messages]);


  useEffect(() => {
    const response = messages[messages.length - 1]["content"];
    const role = messages[messages.length - 1]["role"];
    if (role == "assistant") {
      console.log(response);
      setResponse(response);
      if (!showChat && count > 0) {
        fetchTTS(response);
      }
    }
  }, [messages]);

  useEffect(() => {
    if (audioPlayer) {
      const handleAudioEnd = () => {
        setAvatarState("waiting"); // Transition back to waiting state
        console.log("Audio playback finished");
      };

      // Attach event listener
      audioPlayer.addEventListener('ended', handleAudioEnd);

      // Start playback
      audioPlayer.play();

      // Clean-up function to remove the event listener
      return () => {
        audioPlayer.removeEventListener('ended', handleAudioEnd);
      };
    }
  }, [audioPlayer]);

  const onSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      handleSubmit(e, {
        options: {
          body: {
            additionalData: {
              name: name,
              rand: randqst
            }
          }
        }
      });
      setStreaming(true);
      setCount(count + 1);
      setAvatarState("thinking");
      if (audioPlayer) {
        audioPlayer.pause();
        audioPlayer.currentTime = 0;
        setAudioPlayer(null);
      }
    },
    [handleSubmit, input, audioPlayer, language]
  );

  return (
    <div className="relative max-w-screen-md mx-auto">
      {/* Rest of your unchanged code */}
    </div>
  );
}
