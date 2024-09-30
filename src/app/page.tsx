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
import { SpeechRecognizer, SpeechConfig, AudioConfig, SpeechSynthesizer, ResultReason } from 'microsoft-cognitiveservices-speech-sdk'; // Importamos SpeechSynthesizer para Text-to-Speech
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
    window.location.reload();  // Esto recargará la página para resetear el estado
  }
};

export default function Home() {
  const [randqst, setRandqst] = useState(Math.floor(Math.random() * 11));
  const searchParams = useSearchParams();
  const search = searchParams.get('name');
  let name: string = ""; // Inicializa la variable

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
  const [response, setResponse] = useState("Hola, ¿cómo estás? Soy Zen, tu guía personal en Despierta.online.");
  const [count, setCount] = useState(0);
  const [displayText, setDisplayText] = useState('INITIAIZED: ready to test speech...');
  const [recording, setRecording] = useState("not yet");
  const { messages, input, handleInputChange, handleSubmit, setInput } =
    useChat({
      api: "/api/guru",
      initialMessages: loadMessages()?.length ? loadMessages() : [
        {
          id: "0",
          role: "system",
          content: `
**Welcome to Despierta!**

How are you? I'm Zen, your personal guide at Despierta.online. I'm here to guide you on various topics and help you find what you need for your well-being and personal development. How can I assist you today?`
        },
      ],
      onResponse: () => {
        setStreaming(false);
        saveMessages(messages);
        // Llamamos a la función para que Zen hable automáticamente en español mexicano
        speakResponse(response);
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

  // Función para que Zen hable automáticamente en español mexicano
  async function speakResponse(text: string) {
    try {
      const tokenObj = await getTokenOrRefresh();
      const speechConfig = SpeechConfig.fromAuthorizationToken(tokenObj.authToken, tokenObj.region);

      // Cambiamos solo la voz para la síntesis a español de México (DaliaNeural)
      speechConfig.speechSynthesisVoiceName = "es-MX-DaliaNeural"; 

      const audioConfig = AudioConfig.fromDefaultSpeakerOutput();
      const synthesizer = new SpeechSynthesizer(speechConfig, audioConfig);

      synthesizer.speakTextAsync(text, result => {
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
      console.error("Error durante la síntesis de voz:", error);
    }
  }

  const onClickQuestion = (value: string) => {
    setInput(value);
    setTimeout(() => {
      formRef.current?.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true }));
    }, 1);
  };

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
    saveMessages(messages);
  }, [messages]);

  return (
    <div className="relative max-w-screen-md mx-auto">
      {showChat ? (
        <div className="fixed top-0 inset-x-0 flex justify-between p-4 bg-white shadow-md z-20">
          <button
            className="px-4 py-2 bg-blue-500 text-white rounded"
            onClick={() => setShowChat(true)}
          >
            Chat
          </button>
          <button
            className="px-4 py-2 bg-red-500 text-white rounded"
            onClick={handleReset}
          >
            New Chat
          </button>
          <button
            className="px-4 py-2 bg-green-500 text-white rounded"
            onClick={() => setShowChat(false)}
          >
            Real conversation
          </button>
          <button className="px-4 py-2 bg-gray-500 text-white rounded" onClick={handleReset}>
            Reset
          </button>
        </div>
      ) : null}

      <main className="">
        <div className="w-full">
          {showChat ? (
            <div className="overflow-y-auto relative p-4 flex flex-col justify-between min-h-screen md:min-h-[60vh] z-20">
              {messages.map((message: MessageProps) => (
                <Message key={message.id} {...message} />
              ))}
              {streaming && <MessageLoading />}
              <div ref={messagesEndRef} />
            </div>
          ) : (
            <div className="relative h-[60vh]">
              <img src="waiting.png" alt="Avatar waiting" className="absolute inset-0 h-full w-full object-cover" />
            </div>
          )}
        </div>
        <div>
          <Form 
            ref={formRef}
            onSubmit={handleSubmit}
            inputProps={{
              disabled: streaming,
              value: input,
              onChange: handleInputChange,
            }}
            buttonProps={{  
              disabled: streaming,
            }}
          />
        </div>
      </main>
    </div>
  );
}
