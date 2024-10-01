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
import { SpeechRecognizer, SpeechConfig, AudioConfig, ResultReason } from 'microsoft-cognitiveservices-speech-sdk';
import { BiMicrophone } from "react-icons/bi";
import { BsFillStopCircleFill } from "react-icons/bs";
import { useSearchParams } from 'next/navigation';
import { marked } from 'marked';
import he from 'he';
import Image from 'next/image';

// Funciones utilitarias para guardar y cargar mensajes
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
    window.location.reload();
  }
};

export default function Home() {
  const [randqst, setRandqst] = useState(Math.floor(Math.random() * 11));
  const searchParams = useSearchParams();
  const search = searchParams.get('name');
  let name: string = search ? search : "";
  
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
  const [response, setResponse] = useState("Hola, ¿cómo estás? Soy Zen, tu guía personal en Despierta.online...");
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
          How are you? I'm Zen, your personal guide...`
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
    if (recognizer) {
      recognizer.stopContinuousRecognitionAsync(
        () => {
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
          setDisplayText('ERROR: Speech was cancelled or could not be recognized.');
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

  // Definimos la función fetchTTS antes del useEffect
  const fetchTTS = useCallback(async (text: string) => {
    try {
      if (audioPlayer) {
        audioPlayer.pause();
        audioPlayer.currentTime = 0;
        setAudioPlayer(null);
      }
      const plainText = he.decode(marked(text)).replace(/<[^>]+>/g, '');

      // Aquí actualizamos la voz a es-MX-DaliaNeural para español de México
      const audioRes = await fetch(
        `/api/ttsstt?language=spanish&voice=es-MX-DaliaNeural&text=${encodeURIComponent(plainText)}&type=tts`
      );
      const audio = await audioRes.blob();
      const visemes = JSON.parse(
        (await audioRes.headers.get("visemes")) || "[]"
      );
      const audioUrl = URL.createObjectURL(audio);
      const audioplayer = new Audio(audioUrl);

      setAudioPlayer(audioplayer);
      setVisemes(visemes);
      setAvatarState("speaking");
    } catch (error) {
      console.error("Error fetching TTS:", error);
    }
  }, [audioPlayer]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView();
    }
    saveMessages(messages);
  }, [messages]);

  // useEffect corregido para incluir fetchTTS
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.role === "assistant") {
      setResponse(lastMessage.content);
      if (!showChat && count > 0) {
        fetchTTS(lastMessage.content);
      }
    }
  }, [messages, count, fetchTTS, showChat]);

  // Corrección del useCallback para dependencias faltantes
  const onSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      handleSubmit(e, {
        options: {
          body: {
            additionalData: { name, rand: randqst },
          },
        },
      });
      setStreaming(true);
      setCount((c) => c + 1); // Cambié el uso de count
      setAvatarState("thinking");
      if (audioPlayer) {
        audioPlayer.pause();
        audioPlayer.currentTime = 0;
        setAudioPlayer(null);
      }
    },
    [handleSubmit, audioPlayer, name, randqst]
  );

  return (
    <div className="relative max-w-screen-md mx-auto">
      <main className="">
        <div className="w-full">
          {showChat ? (
            <div className="overflow-y-auto relative p-4 md:p-6 flex flex-col min-h-svh !py-32 md:!py-40">
              {messages.map((message: MessageProps) => (
                <Message key={message.id} {...message} />
              ))}
              {streaming && <MessageLoading />}
              <div ref={messagesEndRef} />
              <div className="fixed z-10 bottom-0 inset-x-0 flex justify-center items-center bg-white">
                <span className="absolute bottom-full h-10 inset-x-0 from-white/0 bg-gradient-to-b to-white pointer-events-none" />
                <div className="w-full max-w-screen-md rounded-xl px-4 md:px-5 py-6">
                  <Form
                    ref={formRef}
                    onSubmit={onSubmit}
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
              </div>
            </div>
          ) : (
            <div className="flex justify-center w-full mar h-dvh flex-col items-center !pb-30 md:!pb-16">
              <div className="relative h-4/5 w-full flex items-center justify-center">
                <Image
                  src="/waiting.png"
                  alt="waiting"
                  className={`absolute h-full w-auto ${avatarState === "waiting" ? "fade-enter fade-enter-active" : "fade-exit fade-exit-active"}`}
                />
                <video
                  src="/listening.mp4"
                  playsInline
                  autoPlay
                  muted
                  loop
                  preload="auto"
                  className={`absolute inset-0 h-full w-full ${avatarState === "listening" ? "fade-enter fade-enter-active" : "fade-exit fade-exit-active"}`}
                />
                <video
                  src="/thinking.mp4"
                  playsInline
                  autoPlay
                  muted
                  loop
                  preload="auto"
                  className={`absolute inset-0 h-full w-full ${avatarState === "thinking" ? "fade-enter fade-enter-active" : "fade-exit fade-exit-active"}`}
                />
                <video
                  src="/speaking.mp4"
                  playsInline
                  autoPlay
                  muted
                  loop
                  preload="auto"
                  className={`absolute inset-0 h-full w-full ${avatarState === "speaking" ? "fade-enter fade-enter-active" : "fade-exit fade-exit-active"}`}
                />
              </div>
              {avatarState === "waiting" && <ResponseMessage content={response} style={{ height: '60%' }} />}
              {avatarState === "listening" && <ResponseMessage content="Listening ..." style={{ height: '60%' }} />}
              {avatarState === "thinking" && <ResponseMessage content="Generating Your response ..." style={{ height: '60%' }} />}
              {avatarState === "speaking" && <ResponseMessage content={response} style={{ height: '60%' }} />}
              <div className="fixed mt-6 z-10 bottom-0 inset-x-0 flex flex-col justify-center items-center bg-white">
                <div className="w-full max-w-screen-md px-4 flex flex-wrap sm:flex-nowrap items-center">
                  <div className="w-full">
                    <Form
                      ref={formRef}
                      onSubmit={onSubmit}
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
                  {avatarState === "waiting" && (
                    <div>
                      {language ? (
                        <button onClick={() => sttFromMic()}>
                          <span className="flex items-center justify-center bg-black rounded-full p-4">
                            <BiMicrophone className="text-blue-500 text-3xl" />
                          </span>
                        </button>
                      ) : (
                        <button onClick={() => setShowLanguageDialog(true)}>
                          <span className="flex items-center justify-center bg-black rounded-full p-4">
                            <BiMicrophone className="text-blue-500 text-3xl" />
                          </span>
                        </button>
                      )}
                    </div>
                  )}
                  {avatarState === "listening" && (
                    <button onClick={() => sttFromMic()}><span className="flex items-center justify-center bg-black rounded-full p-4"><BsFillStopCircleFill className="text-blue-500 text-3xl" /></span></button>
                  )}
                  {avatarState === "thinking" && <>...</>}
                  {avatarState === "speaking" && (
                    <button onClick={() => stopAudioPlayer()}><span className="flex items-center justify-center bg-black rounded-full p-4"><BsFillStopCircleFill className="text-blue-500 text-3xl" /></span></button>
                  )}
                  <button className="bg-red-500 text-xs text-white rounded" onClick={handleReset}>
                    Empezar de nuevo
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        {showLanguageDialog && (
          <div className="fixed inset-0 flex items-center justify-center z-50 bg-gray-800 bg-opacity-75">
            <div className="bg-white rounded-lg p-6 w-1/3">
              <h2 className="mb-4 text-xl font-semibold">Select Language</h2>
              <select
                className="mb-4 px-4 py-2 border rounded w-full"
                onChange={(e) => setLanguage(e.target.value)}
                defaultValue=""
              >
                <option value="" disabled>Select Language</option>
                <option value="en-US">English</option>
                <option value="es-ES">Spanish (Spain)</option>
                <option value="es-MX">Español (México)</option>
              </select>
              <div className="flex justify-end">
                <button className="px-4 py-2 bg-blue-500 text-white rounded" onClick={() => setShowLanguageDialog(false)}>
                  Set Language
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
