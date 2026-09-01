import React, {
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
  useCallback,
  HtmlHTMLAttributes,
  forwardRef,
  useImperativeHandle,
  Ref,
} from "react";
import {
  MagnifyingGlassIcon,
  XMarkIcon,
  UserGroupIcon,
  CheckIcon,
  ChartBarIcon,
  ChartPieIcon,
  ChevronDownIcon,
  ArrowPathIcon,
  ArrowRightIcon,
  DocumentTextIcon,
  ClipboardDocumentCheckIcon,
  Squares2X2Icon,
  EnvelopeIcon,
  MicrophoneIcon,
  PlusIcon,
  PresentationChartBarIcon,
  LanguageIcon,
  ChatBubbleLeftEllipsisIcon,
} from "@heroicons/react/24/outline";
import { twMerge } from "tailwind-merge";
import { Sidebar } from "./Sidebar";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import WeaveAiLogo from "../assets/icons/weave-ai-logo.svg";
import CollapseIcon from "../assets/icons/CollapseIcon";
import ExpandIcon from "../assets/icons/ExpandIcon";
import AttachmentIcon from "../assets/icons/attachment-icn.svg";
import MicIcon from "../assets/icons/mic.svg";
import SendIcon from "../assets/icons/SendIcon";
import PinnedInactiveIcon from "../assets/icons/pinned-inactive-icn.svg";
//import PinnedActiveIcon from '../assets/icons/PinnedActiveIcon';
import PinnedActiveIcon from "../assets/icons/PinnedActiveIcon";
//import CopyIcon from '../assets/icons/copy.svg';
import CopyIcon from "../assets/icons/CopyIcon";
import LikeIcon from "../assets/icons/like.svg";
import DislikeIcon from "../assets/icons/dislike.svg";
//import SpeakerIcon from '../assets/icons/speaker.svg';
import AiStarsIcon from "../assets/icons/AiStarsIcon";
import { BackendService } from "../services/backendService";
import {
  StartupData,
  Service as ApiService,
  Question,
  ChatSession,
  HistoryItem,
  Suggestion,
  StoredChatAttachment,
  normalizeChatUiFeatures,
} from "../models/startup";
import "../styles/input.css";
import "./WeaveAiChat.css";
import { N8nChatResponse, N8nChatService } from "../services/n8nChat";
import { SocketService, WebSocketMessage } from "../services/socketService";
import { HISTORY_ICON_SRC, MOF_BRANDMARK_SRC, WEBSOCKET_URL } from "../constants/chatConstants";
import { FileUploadButton } from "./FileUploadButton";
import tinycolor from "tinycolor2";
import rehypeRaw from "rehype-raw";
import Stepper from "./Stepper";
import GoArrowRightIcon from "../assets/icons/GoArrowRightIcon";
import LineMenuIcon from "../assets/icons/LineMenuIcon";
import { useTranslation } from "react-i18next";
import { animate, motion, AnimatePresence, number } from "framer-motion";
import UserAvatarIcon from "../assets/icons/UserAvatarIcon";
import { marked } from "marked";
import DOMPurify from "dompurify";
import SpeechRecognition, {
  useSpeechRecognition,
} from "react-speech-recognition";
import WaveformVisualizer from "./WaveformVisualizer";
import AudioStopIcon from "../assets/icons/AudioStopIcon";
import CompletedIcon from "../assets/icons/completed.svg";
import { ChartState, RenderChart } from "./AmCharts/Amchart";
import { any } from "@amcharts/amcharts5/.internal/core/util/Array";
import AttachedFilesPreview, { AttachmentPreviewFile } from "./AttachedFilesPreview";
import SearchWeb from "./SearchWeb";
import { NotificationBell } from "./NotificationBell";
import { LanguageToggle } from "./LanguageToggle";
import { AppNotification } from "../utils/notifications";
import { ShareChatModal } from "./ShareChatModal";
interface N8nWebhookConfig {
  webhookUrl: string;
  headers?: Record<string, string>;
}

interface ApiConfig {
  baseUrl: string;
  headers?: Record<string, string>;
}

export interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
  actionButtons?: {
    buttons: Array<{
      label: string;
      actionButtonType: string;
      id?: string;
      mimeType?: string;
      singleUpload?: boolean;
    }>;
  };
  liked: boolean;
  disliked: boolean;
}

export interface ThemeColors {
  primary: string;
  secondary: string;
  accent: string;
}

interface ServiceViewModel {
  id: number;
  title: string;
  description: string;
  category: string;
  nameEn?: string;
  questions: Question[];
  icon?: React.ReactNode;
  micRecordingAllowed: boolean;
  sharable?: boolean;
}

export interface ChatCurrentUser {
  employee_name?: string;
  job_title?: string;
  department?: string;
  email?: string;
}

export interface WeaveAiChatProps {
  apiConfig: ApiConfig;
  isCollapsed?: boolean;
  className?: string;
  placeholder?: string;
  isAIServicesCloseButtonVisible?: boolean;
  checkHistoryItemExists: (weaveChatid: number) => boolean;
  addHistoryItem: (item: HistoryItem) => void;
  onViewAIServicesClose: () => void;
  OnWebSocketEvent: () => void;
  themeColors: ThemeColors;
  sideMenuCloseDefault: boolean;
  IsMobile: boolean;
  IsArabicLanguage: boolean;
  userAvatarUrl?: string;
  userAvatarBase64?: string;
  mobilePaddingTop?: string;
  mobilePaddingBottom?: string;
  onLanguageChange?: (isArabic: boolean) => void;
  userEmail?: string;
  currentUser?: ChatCurrentUser;
  onLogout?: () => void;
}
const MAX_CHAT_ATTACHMENT_BYTES = 30 * 1024 * 1024;
const MAX_CHAT_ATTACHMENT_FILES = 5;

const normalizeMessageText = (value: unknown): string => {
  if (typeof value === "string") {
    return value === "null" || value === "undefined" ? "" : value;
  }
  if (value == null) return "";
  if (
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "bigint"
  ) {
    return String(value);
  }

  try {
    return JSON.stringify(value) ?? "";
  } catch {
    return "";
  }
};

const isChatAttachmentWithinSize = (file: File): boolean =>
  file.size <= MAX_CHAT_ATTACHMENT_BYTES;

const formatAttachmentSize = (bytes: number): string => {
  const megabytes = bytes / (1024 * 1024);
  if (megabytes >= 10) return `${Math.round(megabytes)} MB`;
  if (megabytes >= 0.1) return `${megabytes.toFixed(1)} MB`;
  return `${Math.max(bytes, 0)} B`;
};

export const hexToRgba = (hex: any, alpha = 1) => {
  const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
  hex = hex.replace(
    shorthandRegex,
    (_: any, r: any, g: any, b: any) => r + r + g + g + b + b
  );

  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return hex;
  const r = parseInt(result[1], 16);
  const g = parseInt(result[2], 16);
  const b = parseInt(result[3], 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export const WeaveAiChat: React.FC<WeaveAiChatProps> = ({
  apiConfig,
  isCollapsed,
  className,
  placeholder = "Ask me anything...",
  isAIServicesCloseButtonVisible,
  themeColors,
  onViewAIServicesClose,
  OnWebSocketEvent,
  sideMenuCloseDefault,
  IsMobile,
  IsArabicLanguage,
  userAvatarUrl,
  userAvatarBase64,
  mobilePaddingTop,
  mobilePaddingBottom,
  onLanguageChange,
  userEmail,
  currentUser,
  onLogout,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [attachmentError, setAttachmentError] = useState("");
  const [userMessageAttachedFiles, setUserMessageAttachedFiles] = useState<{
    [messageId: string]: AttachmentPreviewFile[];
  }>({});
  const [IsWebSearch, setIsWebSearch] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [startupData, setStartupData] = useState<StartupData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isExploringServices, setIsExploringServices] = useState(false);
  const [IsMobilePinedServicesToShow, SetIsMobilePinedServicesToShow] =
    useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("");
  const [isSidebarCollapsed, setIsSidebarCollapsed] =
    useState(sideMenuCloseDefault);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeService, setActiveService] = useState<ServiceViewModel | null>( null );
  const [chatIsActiveService, setChatIsActiveService] = useState<boolean>(false);
  const [pinningServiceId, setPinningServiceId] = useState<number | null>(null);
  const chatService = useRef<N8nChatService | null>(null);
  const [isAiResponding, setIsAiResponding] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [userHasStartedChat, setUserHasStartedChat] = useState(false);
  const [IsMessageSubmited, setIsMessageSubmited] = useState(false);
  const [Servicesuggestions, setServiceSuggestions] = useState<Suggestion[]>(
    []
  );
  const sidebarRef = useRef<{
    addHistoryItem: (item: HistoryItem) => void;
    replaceHistoryItem: (temporaryId: string, item: HistoryItem) => void;
    checkHistoryItemExists: (id: string) => boolean;
    openChatById: (chatId: string) => void;
  } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(
    null
  );
  const themeLighter = tinycolor(themeColors.accent).lighten(5).toString();
  const themelighter2 = tinycolor(themeColors.accent).lighten(10).toString();
  const themeDarker = tinycolor(themeColors.primary).darken(20).toString();
  const themeDarker2 = tinycolor(themeColors.primary).darken(10).toString();
  const [isHovered, setIsHovered] = useState<number | null>(null);
  const speechSynthesis = window.speechSynthesis;
  const [activeHover, setActiveHover] = useState(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [buttonColor, setButtonColor] = useState(themeColors.primary);
  const [ChatBasedLoaderFlag, setChatBasedLoaderFlag] = useState<{
    [key: string]: any;
  }>({});
  const chatBasedLoaderFlagRef = useRef<{ [key: string]: boolean }>({});
  const [ActiveChatSessionId, setActiveChatSessionId] = useState<any>();
  const [CurruntInputMessage, setCurruntInputMessage] = useState<string>("");
  const [isInputAnimationComplete, setIsInputAnimationComplete] =
    useState(false);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<AudioWorkletNode | null>(null);
  const audioBufferRef = useRef<Float32Array[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [speechError, setSpeechError] = useState("  ");
  const [IsReocordingStop, setIsReocordingStop] = useState(false);
  const { i18n } = useTranslation();
  const { t } = useTranslation();
  const typewriterIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const submitInFlightRef = useRef(false);
  const socketServiceRef = useRef<SocketService | null>(null);
  const socketHandlersAttachedRef = useRef(false);
  const socketConnectSessionRef = useRef<string | null>(null);
  const recentSocketReplyRef = useRef<Map<string, number>>(new Map());
  const handleWebSocketMessageRef = useRef<(message: WebSocketMessage) => void>(
    () => {}
  );
  const [activeN8nSessionId, setActiveN8nSessionId] = useState<string | null>(null);
  const [chatLockMessage, setChatLockMessage] = useState("");
  const [chatLockAnimation, setChatLockAnimation] = useState("default");

  const [isLandscape, setIsLandscape] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(orientation: landscape)");

    const handleOrientationChange = (e: any) => {
      setIsLandscape(e.matches);
    };

    setIsLandscape(mediaQuery.matches);

    mediaQuery.addEventListener("change", handleOrientationChange);

    return () => {
      mediaQuery.removeEventListener("change", handleOrientationChange);
    };
  }, []);

  const [chartsState, setChartsState] = useState<Record<number, ChartState>>(
    {}
  );
  const [chartModal, setChartModal] = useState<{
    isOpen: boolean;
    chartState: ChartState | null;
    messageId: string;
  }>({
    isOpen: false,
    chartState: null,
    messageId: "",
  });
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Parent applications often construct apiConfig inline. Use a value-based
  // dependency so an equivalent object does not restart the whole chat.
  const apiHeadersSignature = JSON.stringify(apiConfig.headers ?? {});

  const isWebSocketEnabled = startupData?.webSocketEnabled !== false;

  const createN8nChatService = useCallback(
    (webhookUrl: string) => {
      const service = new N8nChatService(
        webhookUrl,
        userEmail || currentUser?.email || 'demo.weave@solutionsplus.ae',
        undefined,
        apiConfig.headers,
        startupData?.defaultModelCode ?? null
      );
      setActiveN8nSessionId(service.getSessionId());
      if (isWebSocketEnabled && socketServiceRef.current?.isConnected()) {
        service.setSocketId(socketServiceRef.current.getSocketId());
      }
      return service;
    },
    [
      apiConfig.headers,
      startupData?.defaultModelCode,
      isWebSocketEnabled,
      userEmail,
      currentUser?.email,
    ]
  );

  const activeApiService = activeService
    ? startupData?.allServices.find((service) => service.id === activeService.id)
    : undefined;

  const chatUiFeatures = normalizeChatUiFeatures(startupData?.chatUiFeatures);

  const isGeneralChat = !activeService && !chatIsActiveService;
  const canShowShareChat =
    chatUiFeatures.chatShareEnabled &&
    messages.length > 0 &&
    (isGeneralChat || (!!activeApiService?.sharable && chatIsActiveService));

  const showHomeHeaderControls =
    (isExploringServices ||
      (!activeService && !userHasStartedChat && messages.length === 0)) &&
    (chatUiFeatures.notificationsEnabled ||
      (chatUiFeatures.languageToggleEnabled && !!onLanguageChange));

  const homeFirstName = currentUser?.employee_name?.split(" ")[0] || "";
  const homeHour = new Date().getHours();
  const homeGreeting = IsArabicLanguage
    ? homeHour < 12
      ? homeFirstName
        ? `صباح الخير، ${homeFirstName}`
        : "صباح الخير"
      : homeFirstName
        ? `مساء الخير، ${homeFirstName}`
        : "مساء الخير"
    : `${
        homeHour < 12
          ? "Good morning"
          : homeHour < 18
            ? "Good afternoon"
            : "Good evening"
      }${homeFirstName ? `, ${homeFirstName}.` : "."}`;

  const handleNotificationSelect = useCallback(
    (notification: AppNotification) => {
      const chatId = notification.chatId;
      if (chatId) {
        sidebarRef.current?.openChatById(chatId);
      } else {
        sidebarRef.current?.openChatById("");
      }
      if (IsMobile) {
        setIsSidebarCollapsed(false);
      }
    },
    [IsMobile],
  );

  const renderHeaderControls = (className?: string) => {
    const showLanguageToggle = !!onLanguageChange;
    if (!showHomeHeaderControls && !showLanguageToggle) return null;

    return (
      <div className={twMerge("flex items-center gap-2", className)}>
        <NotificationBell
          isArabic={IsArabicLanguage}
          userEmail={userEmail}
          apiConfig={apiConfig}
          themeColors={themeColors}
          onSelectNotification={handleNotificationSelect}
          onOpenShared={() => sidebarRef.current?.openChatById("")}
        />
        {showLanguageToggle && (
          <LanguageToggle
            isArabic={IsArabicLanguage}
            onChange={onLanguageChange!}
            themeColors={themeColors}
          />
        )}
      </div>
    );
  };

  useEffect(() => {
    if (startupData?.defaultModelCode) {
      chatService.current?.setModelCode(startupData.defaultModelCode);
    }
  }, [startupData?.defaultModelCode]);

  useEffect(() => {
    return () => {
      if (typewriterIntervalRef.current) {
        clearInterval(typewriterIntervalRef.current);
        typewriterIntervalRef.current = null;
      }
    };
  }, []);
  const [chatData, setChatData] = useState<any>(null);
  const [Contentdata, setContentdata] = useState<any>({});
  useEffect(() => {
    const handleChatInteraction = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { action, data } = customEvent.detail;
      switch (action) {
        case "updateChatData":
          HandleChatResponse(data);
          break;
        case "startChat":
          console.log("Starting chat with payload:", data);
          break;
        case "clearChat":
          console.log("Cleared chat data");
          break;
        default:
          console.log("Unknown action:", action);
      }
    };
    document.addEventListener("chatInteraction", handleChatInteraction);
    return () => {
      document.removeEventListener("chatInteraction", handleChatInteraction);
    };
  }, []);

  useEffect(() => {
    const handleMobileMessage = (event: MessageEvent) => {
      try {
        if (event.data != undefined) {
          const data = JSON.parse(event.data);
          if (data) HandleChatResponse(data);
          const chatEvent = new CustomEvent("chatInteraction", {
            detail: { data },
            bubbles: true,
            composed: true,
          });
          document.dispatchEvent(chatEvent);
        }
      } catch (e) {
        // console.error('Invalid message from RN:', event.data);
      }
    };
    window.addEventListener("message", handleMobileMessage);
    return () => {
      window.removeEventListener("message", handleMobileMessage);
    };
  }, []);

  const HandleChatResponse = (data: any) => {
    try {
      if (data) {
        setChatData(data);
        if (data.content != null) {
          var contentdata = JSON.parse(data?.content);
          console.log("content data is", contentdata);
          setContentdata(contentdata);
          if (!data?.isProcessed && contentdata && contentdata?.session_id) {
            if (!checkLoaderFlagStatus(contentdata?.session_id)) return;

            updateLoaderFlag(contentdata?.session_id, true);
            if (
              !sidebarRef.current?.checkHistoryItemExists(
                contentdata.session_id.toString()
              )
            ) {
              const newHistoryItem: HistoryItem = {
                id: contentdata.session_id,
                title: activeService?.title || "General Chat",
                timestamp: new Date().toISOString(),
                session: {
                  id: contentdata.session_id,
                  createdDate: new Date().toISOString(),
                  chatSessionId: contentdata.session_id,
                  serviceId: activeService?.id || 0,
                  service: startupData?.allServices.find(
                    (c) => c.id === activeService?.id
                  ),
                },
                message:
                  messages.length > 2
                    ? messages[messages.length - 2].text
                    : messages.length === 2
                    ? messages[0].text
                    : "",
              };
              // Add the history item through the Sidebar's function
              sidebarRef.current?.addHistoryItem(newHistoryItem);
            }
            if (
              localStorage.getItem("ActiveChatSessionId") ==
              contentdata?.session_id.toString()
            ) {
              const messageId =
                contentdata?.aiMessageId?.toString() ?? Date.now().toString();
              const statusText = contentdata?.chatLock
                ? contentdata.statusBar
                : contentdata?.output;

              let isExistingMessage = false;
              setMessages((prev) => {
                const existingMessage = prev.find((msg) => msg.id === messageId);
                if (existingMessage) {
                  isExistingMessage = true;
                  return prev.map((msg) =>
                    msg.id === messageId ? { ...msg, text: statusText } : msg
                  );
                }

                const shouldAnimate =
                  startupData?.animation && !isBase64Image(statusText);

                return [
                  ...prev,
                  {
                    id: messageId,
                    text: shouldAnimate ? "" : statusText,
                    isUser: false,
                    timestamp: new Date(),
                    liked: false,
                    disliked: false,
                  },
                ];
              });

              if (
                !isExistingMessage &&
                startupData?.animation &&
                !isBase64Image(statusText)
              ) {
                let charIndex = 0;
                typewriterIntervalRef.current = setInterval(() => {
                  if (charIndex < statusText.length) {
                    setMessages((prevMessages) =>
                      prevMessages.map((msg) =>
                        msg.id === messageId
                          ? {
                              ...msg,
                              text: statusText.substring(0, charIndex + 1),
                            }
                          : msg
                      )
                    );
                    charIndex++;
                  } else {
                    clearInterval(typewriterIntervalRef.current!);
                    typewriterIntervalRef.current = null;
                    setMessages((prevMessages) =>
                      prevMessages.map((msg) =>
                        msg.id === messageId
                          ? { ...msg, text: statusText }
                          : msg
                      )
                    );
                  }
                }, startupData?.typeSpeedMilliSeconds || 3);
              }
            }
          }
          if (contentdata?.chatLock) {
            setTimeout(() => {
              updateLoaderFlag(contentdata?.session_id, true);
            }, 50);
          } else {
            setTimeout(() => {
              updateLoaderFlag(contentdata?.session_id, false);
            }, 50);
            setIsAiResponding(false);
            setIsMessageSubmited(false);
          }
        }
      }
    } catch (err) {
      console.log(" the error is", err);
    }
  };

  const logoVariants = {
    hidden: { scale: 1.2, opacity: 0 },
    visible: {
      scale: 1,
      opacity: 1,
      transition: { duration: 0.4, delay: 0.4, ease: "easeOut" },
    },
  };

  const BottomUpVariant = {
    hidden: { y: 30, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.4, delay: 0.4, ease: "easeOut" },
    },
  };

  const UpsideDownVariant = {
    hidden: { y: -30, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.3, delay: 0.2, ease: "easeOut" },
    },
  };

  const messageVariants = {
    hidden: {
      opacity: 0,
      y: 10,
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.25,
        ease: "easeOut",
      },
    },
    exit: {
      opacity: 0,
      y: 10,
      transition: { duration: 0.2, ease: "easeIn" },
    },
  };

  const handleMouseEnter = () => {
    setButtonColor(themeDarker2);
  };

  const handleMouseLeave = () => {
    setButtonColor(themeColors.primary);
  };

  // function updateStepIndex(start: number, end: number) {
  //   let current = start;
  //   const interval = setInterval(() => {
  //     if (current <= end) {
  //       setCurrentStepIndex(current);
  //       current++;
  //     } else {
  //       clearInterval(interval);
  //     }
  //   }, 1000);
  // }

  const updateLoaderFlag = (sessionId: any, value: any) => {
    chatBasedLoaderFlagRef.current[sessionId] = value;
    setChatBasedLoaderFlag((prev) => {
      const updatedState = {
        ...prev,
        [sessionId]: value,
      };
      return updatedState;
    });
  };

  const checkLoaderFlagStatus = (sessionId: string): boolean => {
    return !!chatBasedLoaderFlagRef.current[sessionId];
  };

  const handleWebSocketMessage = useCallback(
    (message: WebSocketMessage) => {
      const { output, sessionDetails, actionButtons } = message;

      // The socket gateway can replay a completed response. Prefer its stable
      // IDs and fall back to the response text only for a short time window,
      // so a replay cannot create another assistant bubble.
      if (output && sessionDetails && sessionDetails.chatLock !== true) {
        const now = Date.now();
        const stableMessageId = String(
          sessionDetails.aiMessageId ??
            sessionDetails.messageId ??
            sessionDetails.userMessageId ??
            ""
        ).trim();
        const replyKey = [
          sessionDetails.sessionId || chatService.current?.getSessionId() || "",
          stableMessageId || output,
        ].join("|");
        const previousArrival = recentSocketReplyRef.current.get(replyKey);

        for (const [key, arrivedAt] of recentSocketReplyRef.current) {
          if (now - arrivedAt > 5_000) recentSocketReplyRef.current.delete(key);
        }

        if (previousArrival && now - previousArrival < 5_000) {
          return;
        }
        recentSocketReplyRef.current.set(replyKey, now);
      }

      if (sessionDetails) {
        const {
          chatLock,
          chatLockMessage: lockMessage,
          chatLockAnimation: lockAnimation,
          weaveChatid,
        } = sessionDetails;

        if (lockMessage) {
          setChatLockMessage(lockMessage);
        }
        if (lockAnimation) {
          setChatLockAnimation(lockAnimation);
        }

        const isLocked =
          chatLock === true || String(chatLock).toLowerCase() === "true";

        if (isLocked) {
          setIsAiResponding(true);
          setIsMessageSubmited(true);
          updateLoaderFlag(weaveChatid, true);

          if (output) {
            const aiMessageId =
              sessionDetails.aiMessageId?.toString() || Date.now().toString();

            setMessages((prev) => {
              const existingMessage = prev.find((m) => m.id === aiMessageId);
              if (existingMessage) {
                return prev.map((m) =>
                  m.id === aiMessageId
                    ? { ...m, text: output, actionButtons }
                    : m
                );
              }

              return [
                ...prev,
                {
                  id: aiMessageId,
                  text: output,
                  isUser: false,
                  timestamp: new Date(),
                  actionButtons,
                  liked: false,
                  disliked: false,
                },
              ];
            });
          }
          return;
        }

        setIsAiResponding(false);
        setIsMessageSubmited(false);
        updateLoaderFlag(weaveChatid, false);
        setChatLockMessage("");
        setChatLockAnimation("default");

        if (weaveChatid) {
          setChatBasedLoaderFlag((prev) => ({
            ...prev,
            [weaveChatid]: false,
          }));
        }
      }

      if (output && sessionDetails) {
        const aiMessageId =
          sessionDetails.aiMessageId?.toString() || Date.now().toString();
        const fullAiText = output;

        // Chart responses normally arrive over the WebSocket in this app.
        // Keep this in sync with the direct HTTP response path so the chart
        // metadata is attached to the same AI message that renders the text.
        if (sessionDetails.chartDisplay && sessionDetails.chartData) {
          setChartsState((prev) => ({
            ...prev,
            [Number(aiMessageId)]: {
              chartDisplay: true,
              chartData: sessionDetails.chartData,
              chartType: sessionDetails.chartType,
              altType: sessionDetails.altType,
              messageID: Number(aiMessageId),
            },
          }));
        }

        if (sessionDetails.weaveChatid) {
          const sessionIdStr = sessionDetails.weaveChatid.toString();

          if (!sidebarRef.current?.checkHistoryItemExists(sessionIdStr)) {
            const service = startupData?.allServices.find(
              (c) => c.id === activeService?.id
            );
            const newHistoryItem: HistoryItem = {
              id: sessionIdStr,
              title: activeService?.title || "General Chat",
              timestamp: new Date().toISOString(),
              session: {
                id: sessionDetails.weaveChatid,
                createdDate: new Date().toISOString(),
                chatSessionId: sessionDetails.sessionId,
                serviceId: activeService?.id || 0,
                service,
              },
              message:
                messages.length > 0
                  ? messages[messages.length - 1]?.text || ""
                  : "",
            };

            setChatBasedLoaderFlag((prev) => ({
              ...prev,
              [sessionIdStr]: false,
            }));
            sidebarRef.current?.replaceHistoryItem(
              `pending-${chatService.current?.getSessionId() || sessionDetails.sessionId}`,
              newHistoryItem
            );
            localStorage.setItem("ActiveChatSessionId", sessionIdStr);
            setActiveChatSessionId(Number(sessionIdStr));
          }
        }

        setMessages((prev) => {
          const existingMessage = prev.find((m) => m.id === aiMessageId);
          if (existingMessage) {
            return prev.map((m) =>
              m.id === aiMessageId
                ? { ...m, text: fullAiText, actionButtons }
                : m
            );
          }

          return [
            ...prev,
            {
              id: aiMessageId,
              text: fullAiText,
              isUser: false,
              timestamp: new Date(),
              actionButtons,
              liked: false,
              disliked: false,
            },
          ];
        });

        if (sessionDetails.weaveChatid) {
          localStorage.setItem(
            "ActiveChatSessionId",
            sessionDetails.weaveChatid.toString()
          );
          setActiveChatSessionId(sessionDetails.weaveChatid);
        }
      }
    },
    [startupData, activeService, messages]
  );

  handleWebSocketMessageRef.current = handleWebSocketMessage;

  useEffect(() => {
    if (!WEBSOCKET_URL || !activeN8nSessionId || !isWebSocketEnabled) {
      if (!isWebSocketEnabled && socketServiceRef.current) {
        socketServiceRef.current.disconnect();
        socketServiceRef.current = null;
        chatService.current?.setSocketId(null);
      }
      return;
    }

    const attachSocketHandlers = (socket: SocketService) => {
      socket.onMessage("all", (message) => {
        handleWebSocketMessageRef.current(message);
      });
      socket.onConnect((socketId) => {
        chatService.current?.setSocketId(socketId);
      });
      socket.onDisconnect(() => {
        chatService.current?.setSocketId(null);
      });
      socket.onError((error) => {
        console.error("[WeaveAiChat] WebSocket error:", error);
      });
    };

    const ensureSocketConnection = async () => {
      if (socketConnectSessionRef.current === activeN8nSessionId && socketServiceRef.current?.isConnected()) {
        chatService.current?.setSocketId(socketServiceRef.current.getSocketId());
        return;
      }

      if (!socketServiceRef.current) {
        socketServiceRef.current = new SocketService(
          WEBSOCKET_URL,
          activeN8nSessionId
        );
        socketHandlersAttachedRef.current = false;
      } else {
        socketServiceRef.current.setSessionId(activeN8nSessionId);
      }

      if (!socketHandlersAttachedRef.current && socketServiceRef.current) {
        attachSocketHandlers(socketServiceRef.current);
        socketHandlersAttachedRef.current = true;
      }

      if (!socketServiceRef.current.isConnected()) {
        try {
          const socketId = await socketServiceRef.current.connect();
          socketConnectSessionRef.current = activeN8nSessionId;
          chatService.current?.setSocketId(socketId);
        } catch (error) {
          console.warn("[WeaveAiChat] WebSocket connect pending/retry:", error);
        }
      } else {
        socketConnectSessionRef.current = activeN8nSessionId;
        chatService.current?.setSocketId(socketServiceRef.current.getSocketId());
      }
    };

    void ensureSocketConnection();
  }, [activeN8nSessionId, isWebSocketEnabled]);

  useEffect(() => {
    return () => {
      socketServiceRef.current?.disconnect();
      socketServiceRef.current = null;
      socketHandlersAttachedRef.current = false;
      socketConnectSessionRef.current = null;
    };
  }, []);

  const isBase64Image = (text: string): boolean => {
    const base64Pattern =
      /data:image\/(png|jpeg|jpg|gif|bmp|webp);base64,[A-Za-z0-9+/=]+/i;
    return base64Pattern.test(text);
  };

  const handleSendMessage = useCallback(
    async (message: string, options?: { skipUserMessage?: boolean }) => {
      try {
        if (chatService.current === null) {
          const webhookUrl = startupData?.generalChatWebhookUrl;
          if (webhookUrl) {
            chatService.current = createN8nChatService(webhookUrl);
            setMessages([]);
          } else {
            console.error("General chat webhook URL is not available.");
            // Handle the error appropriately, e.g., show an error message to the user
            return; // Prevent sending the message if the service can't be initialized
          }
        }

        chatService.current?.setwebSearchTrue(IsWebSearch);
        chatService.current?.setIsMobile(IsMobile);
        chatService.current?.setLanguage(IsArabicLanguage ? "ar" : "en");
        // Add user message immediately
        const userMessage = {
          id: Date.now().toString(),
          text: message,
          isUser: true,
          timestamp: new Date(),
          liked: false,
          disliked: false,
        };

        const filesToSend = [...attachedFiles];
        if (filesToSend.length > 0) {
          setUserMessageAttachedFiles((prev) => ({
            ...prev,
            [userMessage.id]: filesToSend,
          }));
          setAttachedFiles([]);
          setAttachmentError("");
        }
        if (!options?.skipUserMessage) {
          setMessages((prev) => [...prev, userMessage]);
        }

        const clientSessionId = chatService.current.getSessionId();
        const optimisticHistoryId = `pending-${clientSessionId}`;
        if (
          !ActiveChatSessionId &&
          !sidebarRef.current?.checkHistoryItemExists(optimisticHistoryId)
        ) {
          const service = startupData?.allServices.find(
            (candidate) => candidate.id === activeService?.id
          );
          sidebarRef.current?.addHistoryItem({
            id: optimisticHistoryId,
            title: activeService?.title || "General Chat",
            timestamp: new Date().toISOString(),
            session: {
              id: 0,
              createdDate: new Date().toISOString(),
              chatSessionId: clientSessionId,
              serviceId: activeService?.id || 0,
              service,
            },
            message,
          });
        }
        setIsAiResponding(true);
        setDownloadStates((prev) => {
          const resetStates = Object.keys(prev).reduce((acc, fileId) => {
            acc[fileId] = {
              downloading: false,
              completed: false,
              progress: 0,
            };
            return acc;
          }, {} as typeof prev);
          return resetStates;
        });

        try {
          // Send to API and get response
          if (
            isWebSocketEnabled &&
            socketServiceRef.current?.isConnected()
          ) {
            chatService.current?.setSocketId(
              socketServiceRef.current.getSocketId()
            );
          }
          const response = filesToSend.length > 0
            ? await chatService.current.uploadFiles(filesToSend, {
                chatInput: message,
                // Used by n8n to associate persisted files with this exact
                // user-message row after the AI response is saved.
                clientMessageId: userMessage.id,
              })
            : await chatService.current.sendMessage(message);

          setInputValue("");
          if (isWebSocketEnabled) {
            // The webhook response is the earliest reliable place where n8n
            // returns the database chat id. Register it before returning to
            // WebSocket-only reply handling so the sidebar updates without a
            // history refresh.
            const createdChatId = Number(response?.sessionDetails?.weaveChatid);
            if (Number.isFinite(createdChatId) && createdChatId > 0) {
              const historyId = createdChatId.toString();
              chatService.current?.setweaveChatid(createdChatId);

              const pendingHistoryId = `pending-${clientSessionId}`;
              if (
                sidebarRef.current?.checkHistoryItemExists(pendingHistoryId) ||
                !sidebarRef.current?.checkHistoryItemExists(historyId)
              ) {
                const service = startupData?.allServices.find(
                  (candidate) => candidate.id === activeService?.id
                );
                const newHistoryItem: HistoryItem = {
                  id: historyId,
                  title: activeService?.title || "General Chat",
                  timestamp: new Date().toISOString(),
                  session: {
                    id: createdChatId,
                    createdDate: new Date().toISOString(),
                    chatSessionId:
                      response.sessionDetails?.sessionId ||
                      chatService.current?.getSessionId() ||
                      historyId,
                    serviceId: activeService?.id || 0,
                    service,
                  },
                  message,
                };

                sidebarRef.current?.replaceHistoryItem(
                  pendingHistoryId,
                  newHistoryItem
                );
              }

              localStorage.setItem("ActiveChatSessionId", historyId);
              setActiveChatSessionId(createdChatId);
            }

            // WebSocket unlocks the input when chatLock becomes false.
            // Do not touch submit/responding flags here — the HTTP POST may
            // complete after the socket response and would re-lock the button.
            return;
          }
          if (filesToSend.length > 0) {
            onUploadComplete(response, true);
          } else if (response?.output) {
            chatService.current?.setwebSearchTrue(false);
            setIsWebSearch(false);
            // Check if we have session details and if the history item exists
            if (response.sessionDetails?.weaveChatid) {
              const service = startupData?.allServices.find(
                (c) => c.id === activeService?.id
              );
              const sessionId = response.sessionDetails.weaveChatid.toString();
              // Only add if the history item doesn't exist
              // setChatBasedLoaderFlag(prev => ({
              //   ...prev,
              //   [sessionId]: false
              // }));

              if (response.sessionDetails?.chartDisplay) {
                const {
                  chartDisplay,
                  chartData,
                  chartType,
                  altType,
                  aiMessageId: messageID,
                } = response.sessionDetails;

                if (chartDisplay && messageID !== undefined) {
                  setChartsState((prev) => ({
                    ...prev,
                    [messageID]: {
                      chartDisplay,
                      chartData,
                      chartType,
                      altType,
                      messageID,
                    },
                  }));
                }
              }
              const fullAiText = response.output;
              const aiMessageId =
                response.sessionDetails?.aiMessageId?.toString() ||
                (Date.now() + 1).toString(); // Unique ID for the AI message
              // Add placeholder AI message bubble
              const placeholderAiMessage: Message = {
                id: aiMessageId,
                text: "",
                isUser: false,
                timestamp: new Date(),
                actionButtons: response.actionButtons,
                liked: false,
                disliked: false,
              };
              setMessages((prev) => [...prev, placeholderAiMessage]);

              if (startupData?.animation && !isBase64Image(fullAiText)) {
                let charIndex = 0;
                typewriterIntervalRef.current = setInterval(() => {
                  if (charIndex < fullAiText.length) {
                    setMessages((prevMessages) =>
                      prevMessages.map((msg) =>
                        msg.id === aiMessageId
                          ? {
                              ...msg,
                              text: fullAiText.substring(0, charIndex + 1),
                            }
                          : msg
                      )
                    );
                    charIndex++;
                  } else {
                    clearInterval(typewriterIntervalRef.current!);
                    typewriterIntervalRef.current = null;
                    // Ensure final text update

                    setMessages((prevMessages) => {
                      const updatedMessages = prevMessages.map((msg) =>
                        msg.id === aiMessageId
                          ? { ...msg, text: fullAiText }
                          : msg
                      );
                      return updatedMessages;
                    });
                    setTimeout(() => {
                      setIsMessageSubmited(false);
                    }, 50);
                  }
                }, startupData?.typeSpeedMilliSeconds || 3);
              } else {
                // No animation - directly set the full message
                setMessages((prevMessages) =>
                  prevMessages.map((msg) =>
                    msg.id === aiMessageId ? { ...msg, text: fullAiText } : msg
                  )
                );
                setTimeout(() => {
                  setIsMessageSubmited(false);
                }, 50);
              }

              if (!sidebarRef.current?.checkHistoryItemExists(sessionId)) {
                // Create new history item
                const newHistoryItem: HistoryItem = {
                  id: sessionId,
                  title: activeService?.title || "General Chat",
                  timestamp: new Date().toISOString(),
                  session: {
                    id: response.sessionDetails.weaveChatid,
                    createdDate: new Date().toISOString(),
                    chatSessionId: response.sessionDetails?.sessionId,
                    serviceId: activeService?.id || 0,
                    service: service,
                  },
                  message: message,
                };
                // Add the history item through the Sidebar's function
                setChatBasedLoaderFlag((prev) => ({
                  ...prev,
                  [sessionId]: false,
                }));
                sidebarRef.current?.replaceHistoryItem(
                  `pending-${clientSessionId}`,
                  newHistoryItem
                );
                localStorage.setItem("ActiveChatSessionId", sessionId);
                setActiveChatSessionId(Number(sessionId));
              }
            }

            if (response.sessionDetails?.chatLock) {
              if (response.sessionDetails.chatLockMessage) {
                setChatLockMessage(response.sessionDetails.chatLockMessage);
              }
              if (response.sessionDetails.chatLockAnimation) {
                setChatLockAnimation(response.sessionDetails.chatLockAnimation);
              }
              setIsMessageSubmited(
                !ChatBasedLoaderFlag[response.sessionDetails?.weaveChatid]
              );
              updateLoaderFlag(response.sessionDetails?.weaveChatid, true);
              const lockedChatSessionId = response.sessionDetails?.weaveChatid;
              if (lockedChatSessionId != null) {
                localStorage.setItem(
                  "ActiveChatSessionId",
                  String(lockedChatSessionId)
                );
                setActiveChatSessionId(lockedChatSessionId);
              }
              return;
            } else {
              setChatLockMessage("");
              setChatLockAnimation("default");
              updateLoaderFlag(response.sessionDetails?.weaveChatid, false);
              if (response.sessionDetails?.weaveChatid) {
                setChatBasedLoaderFlag((prev) => ({
                  ...prev,
                  [response.sessionDetails?.weaveChatid || -100]: false,
                }));
                setIsAiResponding(
                  ChatBasedLoaderFlag[response.sessionDetails?.weaveChatid]
                );
                setIsMessageSubmited(
                  !ChatBasedLoaderFlag[response.sessionDetails?.weaveChatid]
                );
              }
            }
            const completedChatSessionId = response.sessionDetails?.weaveChatid;
            if (completedChatSessionId != null) {
              localStorage.setItem(
                "ActiveChatSessionId",
                String(completedChatSessionId)
              );
              setActiveChatSessionId(completedChatSessionId);
            }
          } else {
            // No response output, just stop loading
            setIsMessageSubmited(false);
          }
        } catch (error) {
          console.error("Error sending message:", error);
          if (attachedFiles.length > 0) {
            setAttachmentError(
              error instanceof Error
                ? error.message
                : "The file and message could not be sent to n8n.",
            );
          }
          // Add error message
          const errorMessage = {
            id: Date.now().toString(),
            text: "Sorry, I encountered an error. Please try again.",
            isUser: false,
            timestamp: new Date(),
            liked: false,
            disliked: false,
          };
          setMessages((prev) => [...prev, errorMessage]);
        } finally {
          // setIsAiResponding(false);
        }
      } catch (error) {
        console.error("Error sending message:", error);
        // Add error message
        const errorMessage = {
          id: Date.now().toString(),
          text: "Sorry, I encountered an error. Please try again.",
          isUser: false,
          timestamp: new Date(),
          liked: false,
          disliked: false,
        };
        setMessages((prev) => [...prev, errorMessage]);
      }
    },
    [apiConfig, startupData, activeService, attachedFiles, inputValue, createN8nChatService, isWebSocketEnabled]
  );

  const handleFileUpload = useCallback(async (file: File) => {
    try {
      if (
        isWebSocketEnabled &&
        socketServiceRef.current?.isConnected()
      ) {
        chatService.current?.setSocketId(
          socketServiceRef.current.getSocketId()
        );
      }
      const response = await chatService.current?.sendMessage(
        `File uploaded: ${file.name}`
      );

      // Add file upload message
      const fileMessage = {
        id: Date.now().toString(),
        text: `File "${file.name}" uploaded successfully`,
        isUser: true,
        timestamp: new Date(),
        liked: false,
        disliked: false,
      };
      setMessages((prev) => [...prev, fileMessage]);

      if (isWebSocketEnabled) {
        return;
      }

      // Add AI response if we got one
      if (response?.output) {
        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: response.output,
          isUser: false,
          timestamp: new Date(),
          liked: false,
          disliked: false,
        };
        setMessages((prev) => [...prev, aiMessage]);
      }
    } catch (error) {
      console.error("Error uploading file:", error);
    }
  }, [isWebSocketEnabled]);

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Reset first so scrollHeight can shrink after sending/clearing. This also
    // measures long pasted single-line text after the browser wraps it.
    textarea.style.height = "auto";
    const nextHeight = Math.min(textarea.scrollHeight, 200);
    textarea.style.height = `${nextHeight}px`;
    textarea.style.overflowY = textarea.scrollHeight > 200 ? "auto" : "hidden";
    textarea.scrollTop = textarea.scrollHeight;
  }, [inputValue]);

  const StopVoiceRecording = async () => {
    setIsReocordingStop(true);
    const formData = await GenerateAudioFile();
    if (formData) {
      try {
        const backendService = new BackendService(
          apiConfig.baseUrl,
          apiConfig.headers
        );
        const response = await backendService.PostAudioTranscript(formData);
        if (response.length > 0) {
          const text = response[0].text;
          setInputValue(text);
        }
      } catch (err) {
        console.error("API error:", err);
      }
    }
    setIsReocordingStop(false);
    setIsListening(false);
  };
  function encodeWAV(samples: Float32Array, sampleRate: number): Blob {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    function writeString(view: DataView, offset: number, string: string) {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    }

    function floatTo16BitPCM(
      output: DataView,
      offset: number,
      input: Float32Array
    ) {
      for (let i = 0; i < input.length; i++, offset += 2) {
        let s = Math.max(-1, Math.min(1, input[i]));
        output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      }
    }

    writeString(view, 0, "RIFF");
    view.setUint32(4, 36 + samples.length * 2, true);
    writeString(view, 8, "WAVE");
    writeString(view, 12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true); // Mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true); // byteRate
    view.setUint16(32, 2, true); // blockAlign
    view.setUint16(34, 16, true); // bitsPerSample
    writeString(view, 36, "data");
    view.setUint32(40, samples.length * 2, true);
    floatTo16BitPCM(view, 44, samples);
    return new Blob([view], { type: "audio/wav" });
  }
  const handleVoiceRecording = async () => {
    setIsListening(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;

      // Define AudioWorklet processor code inline
      const workletCode = `
      class RecorderProcessor extends AudioWorkletProcessor {
        process(inputs) {
          const input = inputs[0];
          if (input.length > 0) {
            this.port.postMessage(input[0]); // mono audio
          }
          return true;
        }
      }
      registerProcessor('recorder-processor', RecorderProcessor);
    `;
      const blob = new Blob([workletCode], { type: "application/javascript" });
      const workletURL = URL.createObjectURL(blob);
      await audioContext.audioWorklet.addModule(workletURL);

      const source = audioContext.createMediaStreamSource(stream);
      const workletNode = new AudioWorkletNode(
        audioContext,
        "recorder-processor"
      );
      scriptProcessorRef.current = workletNode; // Now holds AudioWorkletNode

      audioBufferRef.current = [];

      workletNode.port.onmessage = (event) => {
        const chunk = event.data;
        audioBufferRef.current.push(new Float32Array(chunk));
      };

      source.connect(workletNode);
      workletNode.connect(audioContext.destination);

      setSpeechError("");
    } catch (err) {
      console.error("Recording failed:", err);
      setSpeechError(
        "Error accessing microphone. Please ensure it is enabled."
      );
    }
  };

  const GenerateAudioFile = async (): Promise<FormData | null> => {
    const audioContext = audioContextRef.current;
    const stream = mediaStreamRef.current;
    const processor = scriptProcessorRef.current as AudioWorkletNode | null;
    const chunks = audioBufferRef.current;

    if (!audioContext || !stream || !processor || chunks.length === 0) {
      setSpeechError("Recording not active or no audio data.");
      return null;
    }
    processor.disconnect();
    audioContext.close();
    stream.getTracks().forEach((track) => track.stop());
    mediaStreamRef.current = null;
    audioContextRef.current = null;
    scriptProcessorRef.current = null;
    const length = chunks.reduce((acc, val) => acc + val.length, 0);
    const samples = new Float32Array(length);
    let offset = 0;
    for (const chunk of chunks) {
      samples.set(chunk, offset);
      offset += chunk.length;
    }

    const wavBlob = encodeWAV(samples, 44100);
    const wavFile = new File([wavBlob], "recording.wav", { type: "audio/wav" });
    const formData = new FormData();
    formData.append("file", wavFile);
    // Speech recognition language must not be inferred from the UI language.
    // This keeps English voice input in English even when the chat UI is Arabic.
    formData.append("language", "en");

    return formData;
  };
  const handleServiceSelect = (serviceId: number) => {
    console.log("Service selected:", serviceId);
  };

  const handleOpenDashboard = () => {
    console.log("Opening dashboard");
  };

  const handleOpenEditor = () => {
    setIsAiResponding(false);
    setAttachedFiles([]);
    setIsExploringServices(false);
    setIsInputAnimationComplete(false);
    setIsMessageSubmited(false);
    socketServiceRef.current?.disconnect();
    socketServiceRef.current = null;
    socketHandlersAttachedRef.current = false;
    socketConnectSessionRef.current = null;
    setActiveN8nSessionId(null);
    chatService.current = null;
    console.log("Opening editor");
    // handleServiceClick(0);
    setActiveService(null);
    setMessages([]);
    setInputValue("");
    setUserHasStartedChat(false);
    if (IsMobile) {
      setIsSidebarCollapsed(true);
    }
    setChatIsActiveService(false);
  };

  useEffect(() => {
    const initializeApp = async () => {
      try {
        setIsLoading(true);
        const backendService = new BackendService(
          apiConfig.baseUrl,
          apiConfig.headers
        );
        const startupResponse = await backendService.getStartupData();
        const startup = startupResponse.data;
        startup.allServices = startup.categories.flatMap((category) => category.services);
        startup.chatUiFeatures = normalizeChatUiFeatures(startup.chatUiFeatures);
        startup.webSocketEnabled = startup.webSocketEnabled ?? true;
        setStartupData(startup);
        if (startup.categories.length > 0) {
          setActiveTab(startup.categories[0].nameEn);
        }
      } catch (err) {
        setError(t("ErrorMsgOFInitialisedPage"));
        console.error("Startup error:", err);
      } finally {
        setIsLoading(false);
      }
    };
    // updateStepIndex(0, 6);
    initializeApp();
    // setIsSidebarCollapsed(false)
    const lang = IsArabicLanguage ? "ar" : "en";
    i18n.changeLanguage(lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [apiConfig.baseUrl, apiHeadersSignature, IsArabicLanguage]);

  // Map API service to view model
  const mapServiceToViewModel = (
    apiService: ApiService,
    category: string,
    questions: Question[]
  ): ServiceViewModel => ({
    id: apiService.id,
    title: IsArabicLanguage ? apiService.nameAr : apiService.nameEn,
    description: IsArabicLanguage
      ? apiService.descriptionAr
      : apiService.descriptionEn, // Using nameEn as description since API doesn't provide description
    category: category,
    nameEn: apiService.nameEn,
    icon: undefined, // Handle icon mapping if needed
    questions: questions,
    micRecordingAllowed: apiService.micRecordingAllowed,
    sharable: apiService.sharable,
  });

  // Get categories from startup data
  //const categories=[] as any;
  const categories =
    startupData?.categories.map((category) => ({
      nameEn: category.nameEn,
      iconPath: category.iconPath,
      nameAr: category.nameAr,
    })) || [];

  const getExploreServiceIcon = (service: ServiceViewModel) => {
    const key = `${service.nameEn || ""} ${service.title}`.toLowerCase();
    const cls = "w-6 h-6";
    if (key.includes("document")) {
      return <DocumentTextIcon className={cls} strokeWidth={1.6} />;
    }
    if (key.includes("inquiry") || key.includes("bot")) {
      return <ChatBubbleLeftEllipsisIcon className={cls} strokeWidth={1.6} />;
    }
    if (key.includes("email")) {
      return <EnvelopeIcon className={cls} strokeWidth={1.6} />;
    }
    if (key.includes("meeting") || key.includes("summar")) {
      return <MicrophoneIcon className={cls} strokeWidth={1.6} />;
    }
    if (key.includes("presentation")) {
      return <PresentationChartBarIcon className={cls} strokeWidth={1.6} />;
    }
    if (key.includes("translation") || key.includes("translat")) {
      return <LanguageIcon className={cls} strokeWidth={1.6} />;
    }
    if (key.includes("rfp") || key.includes("proposal")) {
      return <ClipboardDocumentCheckIcon className={cls} strokeWidth={1.6} />;
    }
    if (key.includes("search") || key.includes("department")) {
      return <MagnifyingGlassIcon className={cls} strokeWidth={1.6} />;
    }
    return <Squares2X2Icon className={cls} strokeWidth={1.6} />;
  };

  const canShowServicePin = (service: ServiceViewModel) => {
    const name = (service.nameEn || service.title || "").toLowerCase();
    return name.includes("document q&a") || name.includes("proposal evaluation");
  };

  // Filter and map services based on the active tab and search query
  const filteredServices =
    startupData?.categories
      .find((category) => category.nameEn === activeTab)
      ?.services.filter((service) => {
        const q = (searchQuery || "").toLowerCase().trim();
        if (!q) return true;
        return (
          service.nameEn.toLowerCase().includes(q) ||
          (service.nameAr || "").toLowerCase().includes(q) ||
          (service.descriptionEn || "").toLowerCase().includes(q) ||
          (service.descriptionAr || "").toLowerCase().includes(q)
        );
      })
      .map((service) =>
        mapServiceToViewModel(service, activeTab, service.questions)
      ) || [];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      (!inputValue.trim() && attachedFiles.length === 0) ||
      isLoading ||
      isAiResponding ||
      submitInFlightRef.current
    ) return;

    submitInFlightRef.current = true;
    const message = inputValue.trim();
    setInputValue("");

    if (chatData) {
      let chatdata = chatData;
      setChatData((chatdata.isProcessed = false));
    }

    const isFirstMessage = !userHasStartedChat; // Check if this is the first message
    setUserHasStartedChat(true);
    setIsMessageSubmited(true);
    // setIsLoading(true);

    try {
      if (isFirstMessage) {
        setTimeout(() => {
          setIsInputAnimationComplete(true);
        }, 880); // 0.8s duration + 0.08s delay = 880ms
      }
      await handleSendMessage(message);
    } catch (error) {
      console.error("Error in chat interaction:", error);
    } finally {
      submitInFlightRef.current = false;
      // setIsLoading(false);

      setTimeout(() => {
        textareaRef.current?.focus();
      }, 1);
    }
  };

  // const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
  //   const file = e.target.files?.[0];
  //   if (!file) return;

  //   try {
  //     if (webhookConfig) {
  //       // Use n8n webhook for file upload

  //       const formData = new FormData();
  //       formData.append('file', file);

  //       const response = await fetch(webhookConfig.webhookUrl, {
  //         method: 'POST',
  //         headers: {
  //           ...webhookConfig.headers,
  //         },
  //         body: formData,
  //       });

  //       if (!response.ok) {
  //         throw new Error('Failed to upload file');
  //       }

  //       const data = await response.json();

  //       const fileMessage: Message = {
  //         id: Date.now().toString(),
  //         text: `File "${file.name}" uploaded successfully`,
  //         isUser: true,
  //         liked: false,
  //         disliked: false,
  //         timestamp: new Date(),
  //       };

  //       // Add file message to initialMessages
  //       const updatedMessages = [...messages, fileMessage];

  //       if (data.message || data.content) {
  //         const aiMessage: Message = {
  //           id: data.id || (Date.now() + 1).toString(),
  //           text: data.message || data.content,
  //           isUser: false,
  //           liked: false,
  //           disliked: false,
  //           timestamp: new Date(),
  //         };
  //         updatedMessages.push(aiMessage);
  //       }

  //       // Update initialMessages
  //       setInputValue('');
  //       setIsLoading(false);
  //       setIsExploringServices(false);
  //       setActiveService(null);
  //       setActiveTab(Array.from(new Set(categories.map(c => c.nameEn)))[0]);
  //       setSearchQuery('');
  //     } else {
  //       // Use internal handler
  //       await handleFileUpload(file);
  //     }
  //   } catch (error) {
  //     console.error('Error uploading file:', error);
  //     const errorMessage: Message = {
  //       id: Date.now().toString(),
  //       text: 'Sorry, I encountered an error uploading your file. Please try again.',
  //       isUser: false,
  //       liked: false,
  //       disliked: false,
  //       timestamp: new Date(),
  //     };
  //     // Add error message to initialMessages
  //     const updatedMessages = [...messages, errorMessage];
  //     setInputValue('');
  //     setIsLoading(false);
  //     setIsExploringServices(false);
  //     setActiveService(null);
  //     setActiveTab(Array.from(new Set(categories.map(c => c.nameEn)))[0]);
  //     setSearchQuery('');
  //   }
  // };

  const handleServiceClick = (serviceId: number) => {
    setAttachedFiles([]);
    setIsMessageSubmited(false);
    setUserHasStartedChat(false);
    setIsAiResponding(false);
    setChatIsActiveService(true);
    const service = startupData?.allServices.find((c) => c.id === serviceId);
    if (service) {
      if (service.suggestions) setServiceSuggestions(service.suggestions);
      else setServiceSuggestions([]);

          const viewModel = mapServiceToViewModel(
            service,
            String(service.categoryId ?? ''),
            service.questions
          );
      setActiveService(viewModel);
      handleServiceSelect(serviceId);
      chatService.current = createN8nChatService(service.webHookUrl);
      setMessages([]);

      if (service.initialMessages && service.initialMessages.length > 0) {
        service.initialMessages.forEach((message) => {
          const userMessage = {
            id: Date.now().toString(),
            text: message.questionEn,
            isUser: false,
            liked: false,
            disliked: false,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, userMessage]);
        });
      }
      if (
        service.initialMessage &&
        (!IsArabicLanguage
          ? service.initialMessage.questionEn != ""
          : service.initialMessage.questionAr != "")
      ) {
        const placeholderAiMessage: Message = {
          id: "",
          text: IsArabicLanguage
            ? service.initialMessage.questionAr
            : service.initialMessage.questionEn,
          isUser: false,
          timestamp: new Date(),
          liked: false,
          disliked: false,
        };
        setMessages((prev) => [...prev, placeholderAiMessage]);
        setUserHasStartedChat(true);
      }
    }
    setIsExploringServices(false);
  };

  const handleQuestionClick = (question: string) => {
    setInputValue(question);
    // Properly create a form submit event
    const event = new Event("submit", { cancelable: true }) as any;
    handleSubmit(event);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue.trim() && !isLoading) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  const handlePinClick = async (
    serviceId: number,
    isCurrentlyPinned: boolean
  ) => {
    try {
      setPinningServiceId(serviceId);
      const backendService = new BackendService(
        apiConfig.baseUrl,
        apiConfig.headers
      );
      const response = await backendService.togglePinnedService(serviceId);

      if (response.success) {
        setStartupData((prevData) => {
          if (!prevData) return prevData;

          const service = prevData.allServices.find((s) => s.id === serviceId);

          if (!service) return prevData;

          const updatedPinnedServices = response.data
            ? [...prevData.userPinnedServices, service]
            : prevData.userPinnedServices.filter((s) => s.id !== serviceId);

          return {
            ...prevData,
            userPinnedServices: updatedPinnedServices,
          };
        });
      }
    } catch (error) {
      console.error("Error toggling pinned service:", error);
    } finally {
      setPinningServiceId(null);
    }
  };

  const handleNewChat = () => {
    // A new visible chat must also be a new persisted chat. Keeping any of
    // these values would send the next message (and Share action) to the
    // previously opened conversation.
    setIsShareModalOpen(false);
    setActiveChatSessionId(undefined);
    localStorage.removeItem("ActiveChatSessionId");
    setActiveN8nSessionId(null);
    chatService.current = null;
    socketServiceRef.current?.disconnect();
    socketServiceRef.current = null;
    socketHandlersAttachedRef.current = false;
    socketConnectSessionRef.current = null;
    setMessages([]);
    setInputValue("");
    setIsExploringServices(false);
    setActiveService(null);
    setChatIsActiveService(false);
    setUserHasStartedChat(false);
    setSearchQuery("");
  };
  const onMobilePinnedServicesCLicked = () => {
    setIsExploringServices(true);
    SetIsMobilePinedServicesToShow(true);
    setIsSidebarCollapsed(true);
    setAttachedFiles([]);
  };

  const getMimeTypeFromFileName = (fileName: string): string => {
    const extension = fileName.split(".").pop()?.toLowerCase();

    const mimeTypes: Record<string, string> = {
      pdf: "application/pdf",
      doc: "application/msword",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      xls: "application/vnd.ms-excel",
      xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      txt: "text/plain",
      csv: "text/csv",
      png: "image/png",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      gif: "image/gif",
      zip: "application/zip",
      rar: "application/x-rar-compressed",
    };
    return mimeTypes[extension || ""] || "application/octet-stream";
  };

  type FileDownloadItem = {
    filename: string;
    content: string;
    mimetype: string;
  };

  const [downloadStates, setDownloadStates] = useState<{
    [fileId: string]: {
      progress: number;
      completed: boolean;
      downloading: boolean;
    };
  }>({});

  const handleDownloadClick = async (button: {
    label: string;
    actionButtonType: string;
    file_id?: string;
    mimeType?: string;
  }) => {
    try {
      setDownloadStates((prev) => ({
        ...prev,
        [button.file_id || ""]: {
          progress: 0,
          completed: false,
          downloading: true,
        },
      }));

      const response = await chatService?.current?.sendMessage(button.label, {
        download: true,
        file_id: button.file_id,
      });
      if (response) {
        await handleFileDownload(response as any, button.file_id || "");
        setDownloadStates((prev) => ({
          ...prev,
          [button.file_id || ""]: {
            ...prev[button.file_id || ""],
            progress: 50,
          },
        }));
      }
      // if (response?.sessionDetails?.download) {
      //   await handleFileDownload(response);
      // }
    } catch (error) {
      console.error("Download failed:", error);
      setDownloadStates((prev) => ({
        ...prev,
        [button.file_id || ""]: {
          ...prev[button.file_id || ""],
          downloading: false,
          completed: false,
        },
      }));
    }
  };
  const handleFileDownload = async (
    Filedata: FileDownloadItem[],
    file_id: string
  ) => {
    try {
      if (IsMobile) {
        (window as any).ReactNativeWebView.postMessage(
          JSON.stringify({
            type: "download-file",
            filename: Filedata[0].filename,
            base64: Filedata[0].content,
            mimeType: getMimeTypeFromFileName(Filedata[0].filename),
          })
        );

        setDownloadStates((prev) => ({
          ...prev,
          [file_id]: {
            progress: 100,
            completed: true,
            downloading: false,
          },
        }));
        return;
      }
      const byteCharacters = atob(Filedata[0].content);
      const byteNumbers = new Array(byteCharacters.length);
      let currentProgress = 50;
      const chunkSize = Math.floor(byteCharacters.length / 5);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);

        if (i % chunkSize === 0 && currentProgress < 95) {
          currentProgress += 10;
          setDownloadStates((prev) => ({
            ...prev,
            [file_id]: {
              ...prev[file_id],
              progress: currentProgress,
            },
          }));
        }
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], {
        type: getMimeTypeFromFileName(Filedata[0].filename),
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = Filedata[0].filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setDownloadStates((prev) => ({
        ...prev,
        [file_id]: {
          progress: 100,
          completed: true,
          downloading: false,
        },
      }));
    } catch (error) {
      console.error("File download processing failed:", error);
    }
  };

  const RenderDownloadButton = (
    buttons: Array<{
      label: string;
      actionButtonType: string;
      id?: string;
      mimeType?: string;
      singleUpload?: boolean;
      file_id?: string;
    }>
  ) => {
    return buttons?.map((button) => {
      const state = downloadStates[button.file_id || ""] || {
        completed: false,
        downloading: false,
        progress: 0,
      };

      if (button.actionButtonType === "download") {
        return (
          <div
            className="cursor-pointer flex flex-col mt-4"
            key={button.file_id}
            onClick={() => handleDownloadClick(button)}
          >
            <div className="relative w-[250px] cursor-pointer">
              <button
                className="group px-2 py-2 text-[14px] font-medium text-white border rounded-[12px] flex items-center gap-2 w-full relative overflow-hidden"
                style={{
                  backgroundColor: state.completed
                    ? "#57B069E2"
                    : themeColors.primary,
                  borderColor: state.completed
                    ? "#57B069"
                    : themeColors.primary,
                  borderWidth: "1px",
                  borderStyle: "solid",
                }}
              >
                <div className="w-7 h-7 flex-shrink-0 flex items-center justify-center">
                  {state.completed ? (
                    <CompletedIcon
                      className="w-7 h-7"
                      style={{ stroke: "#57B069", fill: "" }}
                    />
                  ) : (
                    <div className="w-7 h-7 flex items-center justify-center">
                      <svg
                        className="w-5 h-5"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M13 7L11.8845 4.76892C11.5634 4.1268 11.4029 3.80573 11.1634 3.57116C10.9516 3.36373 10.6963 3.20597 10.4161 3.10931C10.0992 3 9.74021 3 9.02229 3H5.2C4.0799 3 3.51984 3 3.09202 3.21799C2.71569 3.40973 2.40973 3.71569 2.21799 4.09202C2 4.51984 2 5.0799 2 6.2V7M2 7H17.2C18.8802 7 19.7202 7 20.362 7.32698C20.9265 7.6146 21.3854 8.07354 21.673 8.63803C22 9.27976 22 10.1198 22 11.8V16.2C22 17.8802 22 18.7202 21.673 19.362C21.3854 19.9265 20.9265 20.3854 20.362 20.673C19.7202 21 18.8802 21 17.2 21H6.8C5.11984 21 4.27976 21 3.63803 20.673C3.07354 20.3854 2.6146 19.9265 2.32698 19.362C2 18.7202 2 17.8802 2 16.2V7Z" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <span
                    className="block text-[14px] font-bold truncate"
                    title={button.label}
                  >
                    {button.label}
                  </span>
                </div>

                {state.downloading && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/10">
                    <div
                      className="h-full bg-[#57B069] transition-all duration-300"
                      style={{ width: `${state.progress}%` }}
                    />
                  </div>
                )}
              </button>
            </div>
          </div>
        );
      }
      return null;
    });
  };

  const renderActionButtons = (
    buttons: Array<{
      label: string;
      actionButtonType: string;
      id?: string;
      mimeType?: string;
      singleUpload?: boolean;
    }>
  ) => (
    <div className="flex flex-col gap-2 mt-4">
      <div className="action-buttons-container">
        {buttons.map((button, index) => {
          if (button.actionButtonType === "prompt") {
            return (
              <button
                key={index}
                onClick={() => {
                  handleSendMessage(button.label);
                }}
                className="action-button-prompt inline-flex items-center gap-3 ps-4 pe-1.5 py-1.5 text-sm font-normal text-[#101828] border rounded-full"
                style={{
                  borderColor: themeColors.primary,
                }}
              >
                <span>{button.label}</span>
                <span className="mof-suggestion-chip-arrow">
                  <ArrowRightIcon
                    className={twMerge(
                      "h-3.5 w-3.5",
                      IsArabicLanguage && "rotate-180",
                    )}
                    strokeWidth={2.2}
                  />
                </span>
              </button>
            );
          } else if (button.actionButtonType === "upload") {
            return (
              <FileUploadButton
                key={index}
                label={button.label}
                buttonId={button.id}
                mimeType={button.mimeType}
                singleUpload={button.singleUpload}
                chatService={chatService.current}
                themecolors={themeColors}
                onFileSelect={(loaderflag: boolean) => {
                  setIsMessageSubmited(loaderflag);
                  setIsAiResponding(loaderflag);
                }}
                onUploadComplete={onUploadComplete}
              />
            );
          }
        })}
      </div>
    </div>
  );

  const handleLikeMessage = async (messageId: string) => {
    const messageIdNum = parseInt(messageId, 10);
    if (isNaN(messageIdNum)) {
      console.error("Invalid message ID for like:", messageId);
      return;
    }

    const backendService = new BackendService(
      apiConfig.baseUrl,
      apiConfig.headers
    );
    const response = await backendService.likeChatMessage(messageIdNum);

    if (response.success) {
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg.id === messageId ? { ...msg, liked: true, disliked: false } : msg
        )
      );
    } else {
      console.error("Failed to like message:", messageId);
      // Optionally show an error to the user
    }
  };

  const handleDislikeMessage = async (messageId: string) => {
    const messageIdNum = parseInt(messageId, 10);
    if (isNaN(messageIdNum)) {
      console.error("Invalid message ID for dislike:", messageId);
      return;
    }

    const backendService = new BackendService(
      apiConfig.baseUrl,
      apiConfig.headers
    );
    const response = await backendService.dislikeChatMessage(messageIdNum);

    if (response.success) {
      setMessages((prevMessages) =>
        prevMessages.map((msg) =>
          msg.id === messageId ? { ...msg, liked: false, disliked: true } : msg
        )
      );
    } else {
      console.error("Failed to dislike message:", messageId);
      // Optionally show an error to the user
    }
  };

  const handleCopyMessage = useCallback(
    async (text: string, messageId: string) => {
      try {
        await navigator.clipboard.writeText(text);
        setCopiedMessageId(messageId);
        // Reset the copied state after 2 seconds
        setTimeout(() => {
          setCopiedMessageId(null);
        }, 2000);
      } catch (err) {
        console.error("Failed to copy text: ", err);
      }
    },
    []
  );

  const stripMarkdown = (markdown: string): string => {
    const html = marked(markdown);
    // Create a temporary DOM element to extract text content
    const div = document.createElement("div");
    div.innerHTML = DOMPurify.sanitize(html as any);
    // Extract plain text, normalizing whitespace
    return div.textContent?.trim().replace(/\n+/g, " ") || "";
  };

  const handleSpeakMessage = useCallback((text: string, messageId: string) => {
    // Cancel any ongoing speech
    speechSynthesis.cancel();

    // Create a new utterance
    // const utterance = new SpeechSynthesisUtterance(text);
    const plainText = stripMarkdown(text);
    const utterance = new SpeechSynthesisUtterance(plainText);

    // Set voice properties
    utterance.rate = 1.0; // Speed
    utterance.pitch = 1.0; // Pitch
    utterance.volume = 1.0; // Volume

    // Set event handlers
    utterance.onstart = () => {
      setSpeakingMessageId(messageId);
    };

    utterance.onend = () => {
      setSpeakingMessageId(null);
    };

    utterance.onerror = (event) => {
      console.error("Speech synthesis error:", event);
      setSpeakingMessageId(null);
    };

    // Speak the text
    speechSynthesis.speak(utterance);
  }, []);

  const handleStopSpeaking = useCallback(() => {
    speechSynthesis.cancel();
    setSpeakingMessageId(null);
  }, []);

  const handleRegenerateMessage = (aiMessage: Message) => {
    const idx = messages.findIndex((m) => m.id === aiMessage.id);
    if (idx < 0 || isAiResponding) return;
    const previousUser = [...messages.slice(0, idx)]
      .reverse()
      .find((m) => m.isUser);
    if (!previousUser?.text) return;
    setMessages((prev) => prev.filter((m) => m.id !== aiMessage.id));
    void handleSendMessage(previousUser.text, { skipUserMessage: true });
  };

  const renderMessageActions = (message: Message) => (
    <div className="flex items-center gap-2">
      {(startupData?.likeDisLikeAllowed ?? true) && (
        <div
          role="button"
          tabIndex={0}
          className="p-1 text-[#98A2B3] hover:text-[#667085] transition-colors cursor-pointer"
          onClick={() => handleLikeMessage(message.id)}
        >
          <LikeIcon
            className="w-3.5 h-3.5"
            style={{
              stroke: themeColors.primary,
              strokeWidth: "5",
              fill: message.liked ? themeColors.primary : "none",
              transform: "scale(1)",
            }}
          />
        </div>
      )}
      {(startupData?.likeDisLikeAllowed ?? true) && (
        <div
          role="button"
          tabIndex={0}
          className="p-1 text-[#98A2B3] hover:text-[#667085] transition-colors cursor-pointer"
          onClick={() => handleDislikeMessage(message.id)}
        >
          <DislikeIcon
            className="w-3.5 h-3.5"
            style={{
              stroke: themeColors.primary,
              strokeWidth: "5",
              fill: message.disliked ? themeColors.primary : "none",
              transform: "scale(1)",
            }}
          />
        </div>
      )}
      {(startupData?.copyAllowed ?? true) && (
        <div
          role="button"
          tabIndex={0}
          className={twMerge(
            "p-1 transition-colors cursor-pointer",
            copiedMessageId === message.id
              ? "text-[#C6A75D]"
              : "text-[#98A2B3] hover:text-[#667085]"
          )}
          onClick={() => handleCopyMessage(message.text, message.id)}
          title={copiedMessageId === message.id ? "Copied!" : "Copy message"}
        >
          {copiedMessageId === message.id ? (
            <CheckIcon
              className="w-3.5 h-3.5"
              style={{
                stroke: themeColors.primary,
                strokeWidth: "5",
                fill: "none",
                transform: "scale(1)",
                color: themeColors.primary,
              }}
            />
          ) : (
            <CopyIcon
              className="w-3.5 h-3.5"
              style={{
                stroke: themeColors.primary,
                strokeWidth: "5",
                fill: "none",
                transform: "scale(1)",
              }}
            />
          )}
        </div>
      )}
      <div
        role="button"
        tabIndex={0}
        className="p-1 text-[#98A2B3] hover:text-[#667085] transition-colors cursor-pointer"
        onClick={() => handleRegenerateMessage(message)}
        title="Regenerate"
      >
        <ArrowPathIcon
          className="w-3.5 h-3.5"
          style={{ color: themeColors.primary }}
        />
      </div>
    </div>
  );

  const markdownComponents: Components = {
    // Table components for HTML tables
    table: ({ node, ...props }) => (
      <div className="overflow-x-auto">
        <table
          className="min-w-full border-collapse border border-gray-300"
          {...props}
        />
      </div>
    ),
    th: ({ node, ...props }) => (
      <th className="px-4 py-2 bg-gray-100 border border-gray-300" {...props} />
    ),
    td: ({ node, ...props }) => (
      <td className="px-4 py-2 border border-gray-300" {...props} />
    ),
    tr: ({ node, ...props }) => <tr className="hover:bg-gray-50" {...props} />,
    // Regular markdown components
    p: ({ children, ...props }) => (
      <p className="m-0" {...props}>
        {children}
      </p>
    ),
    strong: ({ children, ...props }) => (
      <strong className="font-semibold" {...props}>
        {children}
      </strong>
    ),
    em: ({ children, ...props }) => (
      <em className="italic" {...props}>
        {children}
      </em>
    ),
    ul: ({ children, ...props }) => (
      <ul className="list-disc pl-4 my-2" {...props}>
        {children}
      </ul>
    ),
    ol: ({ children, ...props }) => (
      <ol className="list-decimal pl-4 my-2" {...props}>
        {children}
      </ol>
    ),
    li: ({ children, ...props }) => (
      <li className="my-1" {...props}>
        {children}
      </li>
    ),
    code: ({ children, ...props }) => (
      <code
        className="bg-gray-100 rounded px-1 py-0.5 font-mono text-sm"
        {...props}
      >
        {children}
      </code>
    ),
    pre: ({ children, ...props }) => (
      <pre className="bg-gray-100 rounded p-2 my-2 overflow-x-auto" {...props}>
        {children}
      </pre>
    ),
  };

  const markdownComponentsForImg: Components = {
    img: ({ node, src, alt, ...props }) => (
      <img
        src={src}
        alt={alt || ""}
        className="rounded-lg max-w-full h-auto"
        {...props}
      />
    ),
  };

  const renderMessageContent = (text: string) => {
    return (
      <ReactMarkdown
        rehypePlugins={[rehypeRaw]}
        components={markdownComponents}
      >
        {text}
      </ReactMarkdown>
    );
  };
  themeColors.secondary;

  const onUploadComplete = (response: any, isnewChat: boolean = false) => {
    if (isWebSocketEnabled) {
      return;
    }

    if (response?.output) {
      if (
        localStorage.getItem("ActiveChatSessionId") ===
          String(response.sessionDetails?.weaveChatid ?? "") ||
        isnewChat
      ) {
        const fullAiText = response.output;
        const aiMessageId =
          response.sessionDetails?.aiMessageId?.toString() ||
          (Date.now() + 1).toString(); // Unique ID for the AI message
        const placeholderAiMessage: Message = {
          id: aiMessageId,
          text: "",
          isUser: false,
          timestamp: new Date(),
          actionButtons: response.actionButtons,
          liked: false,
          disliked: false,
        };
        setMessages((prev) => [...prev, placeholderAiMessage]);
        let charIndex = 0;

        if (startupData?.animation && !isBase64Image(fullAiText)) {
          typewriterIntervalRef.current = setInterval(() => {
            if (charIndex < fullAiText.length) {
              setMessages((prevMessages) =>
                prevMessages.map((msg) =>
                  msg.id === aiMessageId
                    ? { ...msg, text: fullAiText.substring(0, charIndex + 1) }
                    : msg
                )
              );
              charIndex++;
            } else {
              clearInterval(typewriterIntervalRef.current!);
              typewriterIntervalRef.current = null;

              setMessages((prevMessages) =>
                prevMessages.map((msg) =>
                  msg.id === aiMessageId ? { ...msg, text: fullAiText } : msg
                )
              );

              setTimeout(() => {
                setIsMessageSubmited(
                  response.sessionDetails?.chatLock ? true : false
                );
              }, 50);
            }
          }, startupData?.typeSpeedMilliSeconds || 3);
        } else {
          // No animation - directly set the full message
          setMessages((prevMessages) =>
            prevMessages.map((msg) =>
              msg.id === aiMessageId ? { ...msg, text: fullAiText } : msg
            )
          );
          setTimeout(() => {
            setIsMessageSubmited(
              response.sessionDetails?.chatLock ? true : false
            );
          }, 50);
        }
      }
    }

    if (response.sessionDetails?.chatLock) {
      const lockedChatSessionId = response.sessionDetails.weaveChatid;
      if (lockedChatSessionId != null) {
        localStorage.setItem("ActiveChatSessionId", String(lockedChatSessionId));
      }
      setIsMessageSubmited(true);
      setIsMessageSubmited(true);
      updateLoaderFlag(response.sessionDetails?.weaveChatid, true);
      return;
    } else {
      updateLoaderFlag(response.sessionDetails?.weaveChatid, false);
      if (response.sessionDetails?.weaveChatid) {
        setChatBasedLoaderFlag((prev) => ({
          ...prev,
          [response.sessionDetails?.weaveChatid || -100]: false,
        }));
        setIsAiResponding(
          ChatBasedLoaderFlag[response.sessionDetails?.weaveChatid]
        );
        setIsMessageSubmited(
          !ChatBasedLoaderFlag[response.sessionDetails?.weaveChatid]
        );
      }
    }
  };

  const allowedExtensions = ["PDF", "DOCX", "CSV", "JPG", "JPEG", "PNG", "PPTX"];
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;

    const fileArray = Array.from(files);
    e.target.value = "";

    const oversizedFiles = fileArray.filter(
      (file) => !isChatAttachmentWithinSize(file),
    );
    const filteredFiles = fileArray.filter((file) => {
      const ext = file.name.split(".").pop()?.toUpperCase() || "";
      return (
        allowedExtensions.includes(ext) && isChatAttachmentWithinSize(file)
      );
    });

    const unsupportedFiles = fileArray.filter((file) => {
      const ext = file.name.split(".").pop()?.toUpperCase() || "";
      return !allowedExtensions.includes(ext);
    });

    const errorParts: string[] = [];
    if (unsupportedFiles.length) {
      const names = unsupportedFiles.map((file) => file.name).join(", ");
      errorParts.push(
        IsArabicLanguage
          ? `أنواع الملفات المدعومة: ${allowedExtensions.join(", ")}. تم رفض: ${names}`
          : `Supported file types: ${allowedExtensions.join(", ")}. Rejected: ${names}`,
      );
    }
    if (oversizedFiles.length) {
      const names = oversizedFiles
        .map((file) => `${file.name} (${formatAttachmentSize(file.size)})`)
        .join(", ");
      errorParts.push(
        IsArabicLanguage
          ? `الحد الأقصى لحجم الملف هو 30 ميغابايت لكل ملف. تم رفض: ${names}`
          : `Each file must be 30 MB or smaller. Too large: ${names}`,
      );
    }
    if (!filteredFiles.length) {
      setAttachmentError(errorParts.join(" "));
      return;
    }
    setAttachedFiles((currentFiles) => {
      const combined = [...currentFiles];
      for (const file of filteredFiles) {
        const duplicate = combined.some(
          (existing) =>
            existing.name === file.name &&
            existing.size === file.size &&
            existing.lastModified === file.lastModified,
        );
        if (!duplicate) combined.push(file);
      }

      if (combined.length > MAX_CHAT_ATTACHMENT_FILES) {
        errorParts.push(
          IsArabicLanguage
            ? "يمكنك إرفاق 5 ملفات كحد أقصى في الرسالة الواحدة."
            : "You can attach a maximum of 5 files to one message.",
        );
      }
      setAttachmentError(errorParts.join(" "));
      return combined.slice(0, MAX_CHAT_ATTACHMENT_FILES);
    });
  };

  const removeFile = (fileName: File) => {
    console.log("fileName", fileName);
    setAttachedFiles(
      attachedFiles.filter((file) => file.name !== fileName.name)
    );
  };

  const handleSelect = (option: "attachment" | "search") => {
    if (option === "attachment") {
      fileInputRef.current?.click();
    } else if (option === "search") {
      setIsWebSearch(true);
    }
    const event = new CustomEvent("select", {
      detail: option,
      bubbles: true,
      composed: true,
    });
    document.dispatchEvent(event);
  };

  function ViewChartClick(message: Message) {
    setChartModal({
      isOpen: true,
      chartState: chartsState[Number(message.id)],
      messageId: message.id,
    });
  }
  function DisplayCharts(message: Message) {
    return (
      <div>
        {/* Desktop: Show Inline Chart + Button */}
        <div className="hidden sm:block">
          <RenderChart
            chartState={chartsState[Number(message.id)]}
            setChartState={(newState) =>
              setChartsState((prev) => ({
                ...prev,
                [message.id]:
                  typeof newState === "function"
                    ? newState(prev[Number(message.id)])
                    : newState,
              }))
            }
            themeColors={themeColors}
          />

          {/* View Full Chart Button for Desktop */}
          <div className="mt-3 flex justify-center">
            <button
              onClick={() =>
                setChartModal({
                  isOpen: true,
                  chartState: chartsState[Number(message.id)],
                  messageId: message.id,
                })
              }
              className="flex items-center gap-2 px-4 py-2 bg-white border-2 rounded-lg hover:shadow-md transition-all duration-200"
              style={{
                borderColor: themeColors.primary,
                color: themeColors.primary,
              }}
            >
              <ChartBarIcon className="w-4 h-4" />
              <span className="font-medium text-sm">{t("ViewFullChart")}</span>
              <div className="ml-2">
                <svg
                  className="w-3 h-3"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </div>
            </button>
          </div>
        </div>

        {/* Mobile: Show Only Button */}
        <button
          onClick={() => ViewChartClick(message)}
          className="md:hidden flex items-center gap-3 px-4 py-3 bg-white border-2 rounded-lg hover:shadow-md transition-all duration-200 w-full"
          style={{
            borderColor: themeColors.primary,
            color: themeColors.primary,
          }}
        >
          <ChartBarIcon className="w-5 h-5" />
          <span className="font-medium">{t("ViewChart")}</span>
          <div className="ml-auto">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </div>
        </button>
      </div>
    );
  }

  const renderChatInput = (increase: boolean) => (
    <motion.div
      initial={{ y: userHasStartedChat ? "-38vh" : 30, opacity: 1 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{
        duration: 0.8,
        ease: [0.25, 0.8, 0.25, 1],
        delay: userHasStartedChat ? 0.08 : 0.4,
      }}
      className="mb-2 max-w-[960px] mx-auto sticky"
    >
      {/* AI Loading Indicator with Chat Lock Animations */}
      {isAiResponding && (
        <div
          className="max-w-full lg:max-w-[800px] md:min-w-[400px] lg:min-w-[800px] mx-auto flex items-center justify-start gap-3 pb-3 px-4"
          style={{ '--primary-color': themeColors.secondary } as React.CSSProperties}
        >
          <div className="chat-lock-indicator">
            {(() => {
              const animationType = chatLockAnimation || "default";
              const message =
                chatLockMessage ||
                (chatData?.isProcessed
                  ? Contentdata.statusBar
                  : t("AnalyzingYourRequestWithDots"));

              let effectiveAnimation = animationType;
              if (animationType === "default" && message) {
                const lowerMessage = message.toLowerCase();
                if (
                  lowerMessage.includes("reading document") ||
                  lowerMessage.includes("reading file")
                ) {
                  effectiveAnimation = "reading";
                } else if (
                  lowerMessage.includes("web search") ||
                  lowerMessage.includes("searching")
                ) {
                  effectiveAnimation = "search";
                } else if (
                  lowerMessage.includes("preparing") ||
                  lowerMessage.includes("generating")
                ) {
                  effectiveAnimation = "preparing";
                } else if (
                  lowerMessage.includes("reading data") ||
                  lowerMessage.includes("fetching") ||
                  lowerMessage.includes("loading data")
                ) {
                  effectiveAnimation = "data";
                } else if (
                  lowerMessage.includes("analyzing") ||
                  lowerMessage.includes("processing")
                ) {
                  effectiveAnimation = "analyzing";
                } else if (
                  lowerMessage.includes("thinking") ||
                  lowerMessage.includes("considering")
                ) {
                  effectiveAnimation = "thinking";
                }
              }

              const knownAnimations = [
                "reading",
                "search",
                "preparing",
                "data",
                "analyzing",
                "thinking",
                "processing",
              ];

              return (
                <>
                  <div className="chat-lock-icon">
                    {effectiveAnimation === "reading" && (
                      <div className="chat-lock-reading" />
                    )}
                    {effectiveAnimation === "search" && (
                      <div className="chat-lock-search" />
                    )}
                    {effectiveAnimation === "preparing" && (
                      <div className="chat-lock-preparing">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                    )}
                    {effectiveAnimation === "data" && (
                      <div className="chat-lock-data">
                        <span></span>
                        <span></span>
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                    )}
                    {effectiveAnimation === "analyzing" && (
                      <div className="chat-lock-analyzing">
                        <span></span>
                      </div>
                    )}
                    {effectiveAnimation === "thinking" && (
                      <div className="chat-lock-thinking" />
                    )}
                    {effectiveAnimation === "processing" && (
                      <div className="chat-lock-processing" />
                    )}
                    {(effectiveAnimation === "default" ||
                      !knownAnimations.includes(effectiveAnimation)) && (
                      <div className="chat-lock-spinner" />
                    )}
                  </div>
                  <span className="chat-lock-text">{message}</span>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {attachedFiles.length > 0 && (
        <div className="p-2 overflow-x-auto gap-2 max-w-full lg:max-w-[800px] md:min-w-[400px] lg:min-w-[800px] mx-auto relative">
          <AttachedFilesPreview
            files={attachedFiles}
            removeFile={removeFile}
            themeColor={themeColors}
            classname="flex justify-start items-center"
          />
        </div>
      )}

      <div
        className="chatgpt-input-wrapper w-full max-w-[800px] mx-auto relative rounded-full"
        style={{
          border: isFocused
            ? `1px solid ${themeColors.primary}`
            : "1px solid #E8DEC8",
          boxShadow: isFocused
            ? `0 0 0 3px ${themeColors.primary}24, 0 6px 18px rgba(16, 24, 40, 0.08)`
            : "0 4px 14px rgba(16, 24, 40, 0.06)",
          backgroundColor: "#FFFCFA",
          transition: "box-shadow 0.2s ease, border-color 0.2s ease",
        }}
      >
        <div className="flex w-full items-center ps-3 pe-2 py-1.5 gap-1">
          {!isListening && !IsMessageSubmited && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isAiResponding || isLoading}
              className="flex-shrink-0 p-1.5 text-[#98A2B3] hover:text-[#C6A75D] rounded-full transition-colors disabled:opacity-40 disabled:hover:text-[#98A2B3]"
              title={
                IsArabicLanguage
                  ? "إضافة مرفق (حتى 30 ميغابايت لكل ملف)"
                  : "Add attachment (max 30 MB per file)"
              }
              aria-label={IsArabicLanguage ? "إضافة مرفق" : "Add attachment"}
            >
              <PlusIcon className="h-6 w-6" strokeWidth={1.8} />
            </button>
          )}
          <div className="flex-1 relative min-w-0">
            {isListening && (
              <div className="flex items-center gap-3 min-h-[40px] pe-2">
                <span className="voice-recording-label">
                  {IsArabicLanguage ? 'جاري التسجيل' : 'Recording'}
                </span>
                <WaveformVisualizer listening={isListening} themeColors={themeColors} />
              </div>
            )}
            <textarea
              ref={textareaRef}
              value={inputValue ?? ""}
              onChange={(e) => {
                setInputValue(e.target.value);
              }}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (inputValue.trim() && !isLoading && !isAiResponding) {
                    handleSubmit(e as any);
                  }
                }
              }}
              placeholder={t("AskMeAnythingwithDots")}
              className="w-full py-2.5 px-1 bg-transparent focus:outline-none focus:ring-0 focus:border-0 text-[#344054] placeholder-[#98A2B3] text-[15px] resize-none border-0 outline-none transition-all duration-200"
              disabled={isAiResponding || isLoading}
              rows={1}
              style={{
                caretColor: themeColors.primary,
                minHeight: "24px",
                maxHeight: "200px",
                lineHeight: "1.5",
                display: isListening ? "none" : undefined,
              }}
            />
          </div>

          <div className="flex items-center gap-2">
            {!isListening && !IsMessageSubmited && IsWebSearch && (
              <SearchWeb
                onClick={() => setIsWebSearch(false)}
                themeColors={themeColors}
                label={t("Search")}
              />
            )}

            {isListening
              ? !IsMessageSubmited && (
                  <button
                    type="button"
                    onClick={StopVoiceRecording}
                    className="voice-stop-button"
                    title={IsArabicLanguage ? 'إيقاف التسجيل' : 'Stop recording'}
                  >
                    {!IsReocordingStop && (
                      <span className="voice-stop-icon" aria-hidden="true">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <rect x="1" y="1" width="12" height="12" rx="2" fill="white" />
                        </svg>
                      </span>
                    )}
                    {IsReocordingStop && (
                      <div
                        className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2"
                        style={{ borderColor: themeColors.primary }}
                      />
                    )}
                    <span className="voice-stop-label">
                      {IsArabicLanguage ? 'إيقاف' : 'Stop'}
                    </span>
                  </button>
                )
              : !IsMessageSubmited && (
                  <button
                    type="button"
                    onClick={handleVoiceRecording}
                    disabled={isAiResponding}
                    className="p-1.5 text-[#667085] hover:text-[#C6A75D] rounded-full transition-all duration-200 disabled:opacity-40"
                    title={IsArabicLanguage ? 'بدء التسجيل الصوتي' : 'Start voice recording'}
                  >
                    <MicrophoneIcon className="w-5 h-5" strokeWidth={1.7} />
                  </button>
                )}

            {!isListening &&
              (!IsMessageSubmited ? (
                <button
                  onClick={handleSubmit}
                  className={twMerge(
                    "mof-send-btn",
                    (inputValue.trim() || attachedFiles.length > 0) &&
                      !isAiResponding &&
                      "mof-send-btn--active",
                  )}
                  disabled={
                    isLoading ||
                    isAiResponding ||
                    (!inputValue.trim() && attachedFiles.length === 0)
                  }
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ transform: IsArabicLanguage ? "rotate(180deg)" : undefined }}
                  >
                    <path d="M12 19V5M5 12l7-7 7 7"/>
                  </svg>
                </button>
              ) : (
                <button
                  onClick={() => {
                    if (typewriterIntervalRef.current) {
                      clearInterval(typewriterIntervalRef.current);
                      typewriterIntervalRef.current = null;
                    }
                    setIsMessageSubmited(false);
                    updateLoaderFlag(ActiveChatSessionId, false);
                    setIsAiResponding(false);
                  }}
                  className="mof-send-btn mof-send-btn--active"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="6" width="12" height="12" rx="2"/>
                  </svg>
                </button>
              ))}
          </div>
        </div>
      </div>
      {attachmentError && (
        <p
          className="max-w-full lg:max-w-[800px] md:min-w-[400px] lg:min-w-[800px] mx-auto px-4 pt-2 text-sm font-medium text-[#D92D20]"
          role="alert"
        >
          {attachmentError}
        </p>
      )}

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        multiple
        onChange={handleFileChange}
        accept=".docx,.pdf,.csv,.jpg,.jpeg,.png,.pptx,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/pdf,text/csv,image/jpeg,image/png"
      />

      <div className="w-full flex flex-col align-items-start" />
    </motion.div>
  );

const RenderChartFullScreen = () => {
  return (
    <AnimatePresence>
      {chartModal.isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-0 sm:p-4"
          onClick={() =>
            setChartModal({ isOpen: false, chartState: null, messageId: "" })
          }
        >
        {/* 🖥️ Desktop / Tablet Layout (hidden on mobile) */}
<motion.div
  initial={{ scale: 0.9, opacity: 0 }}
  animate={{ scale: 1, opacity: 1 }}
  exit={{ scale: 0.9, opacity: 0 }}
  onClick={(e) => e.stopPropagation()}
  className="hidden sm:flex flex-col bg-white rounded-xl shadow-2xl w-full max-w-6xl h-[90vh]"
>
  {/* Header */}
  <div className="flex items-center justify-between p-4 border-b border-gray-200">
    <h3 className="text-lg font-semibold text-gray-900">{t("ChartView")}</h3>
    <button
      onClick={() =>
        setChartModal({
          isOpen: false,
          chartState: null,
          messageId: "",
        })
      }
      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
    >
      <XMarkIcon className="w-6 h-6 text-gray-500" />
    </button>
  </div>

  {/* Instructions */}
  <div className="flex flex-wrap gap-4 px-4 py-2 text-xs text-gray-600 border-b border-gray-100">
    <div className="flex items-center gap-1">
      <svg className="w-4 h-4" fill="none" stroke={themeColors.primary} viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
        />
      </svg>
      <span>{t("Click&DragToPan")}</span>
    </div>
    <div className="flex items-center gap-1">
      <svg className="w-4 h-4" fill="none" stroke={themeColors.primary} viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
        />
      </svg>
      <span>{t("ScrollToZoom")}</span>
    </div>
    <div className="flex items-center gap-1">
      <svg className="w-4 h-4" fill="none" stroke={themeColors.primary} viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <span>{t("HoverForDetails")}</span>
    </div>
  </div>

  {/* Chart Area */}
  <div className="flex justify-center items-center flex-grow p-4 overflow-auto">
    {chartModal.chartState && (
      <RenderChart
        chartState={
          chartsState[Number(chartModal.messageId)] || chartModal.chartState
        }
        setChartState={(newState) => {
          const updatedState =
            typeof newState === "function"
              ? newState(
                  chartsState[Number(chartModal.messageId)] ||
                    chartModal.chartState
                )
              : newState;

          setChartsState((prev) => ({
            ...prev,
            [chartModal.messageId]: updatedState,
          }));
          setChartModal((prev) => ({
            ...prev,
            chartState: updatedState,
          }));
        }}
        themeColors={themeColors}
        isFullScreen={true}
        isLandscape={isLandscape}
      />
    )}
  </div>
</motion.div>

{/* 📱 Mobile Layout (hidden on larger screens) */}
  <motion.div
  initial={{ scale: 0.9, opacity: 0 }}
  animate={{ scale: 1, opacity: 1 }}
  exit={{ scale: 0.9, opacity: 0 }}
  onClick={(e) => e.stopPropagation()}
  className="flex sm:hidden flex-col bg-white rounded-xl shadow-2xl w-full h-full max-h-screen"
>
  {/* Mobile Header with Close Button */}

    <div className="flex flex-col w-full flex-1 min-h-0 overflow-hidden p-2 pt-12">
      <RenderChart
        chartState={
          chartsState[Number(chartModal.messageId)] || chartModal.chartState
        }
        setChartState={(newState) => {
          const updatedState =
            typeof newState === "function"
              ? newState(
                  chartsState[Number(chartModal.messageId)] ||
                    chartModal.chartState
                )
              : newState;

          setChartsState((prev) => ({
            ...prev,
            [chartModal.messageId]: updatedState,
          }));
          setChartModal((prev) => ({
            ...prev,
            chartState: updatedState,
          }));
        }}
        themeColors={themeColors}
        isFullScreen={true}
        isLandscape={isLandscape}
        onclose={()=>{setChartModal({
          isOpen: false,
          chartState: null,
          messageId: "",
        })}}
      />
    </div>
</motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

  const RenderRecommendationItems = (IsSeriveSuggestions: boolean = false) => {
    if (isLoading || !startupData?.suggestions?.length) return null;

    return (
      <motion.div
        variants={BottomUpVariant}
        initial="hidden"
        animate={(animate as React.CSSProperties) ? "visible" : "hidden"}
        className="h-[30%] mb-6 max-w-[960px] mx-auto px-4 w-full"
      >
        <div className="max-w-full md:min-w-[350px] md:max-w-[90%] lg:max-w-[720px] lg:min-w-[720px] mx-auto relative">
          <div className="text-[10px] font-bold text-base text-left flex flex-col gap-3">
            <div>{t("Recommendation")}</div>
            <div
              className="flex flex-col gap-3 overflow-y-auto"
              style={{ maxHeight: "250px" }}
            >
              {(IsSeriveSuggestions
                ? Servicesuggestions
                : startupData?.suggestions
              )?.map((Item, index) => (
                <div
                  key={Item.id}
                  onClick={() =>
                    setInputValue(IsArabicLanguage ? Item.nameAr : Item.nameEn)
                  }
                  className="flex gap-2 text-[14px] border-b-2 border-gray-300 pb-2 cursor-pointer"
                  style={{ color: themeColors.primary }}
                >
                  <AiStarsIcon
                    className="w-3 h-3"
                    fill={themeColors.primary}
                    stroke={themeColors.primary}
                  />
                  <div>{IsArabicLanguage ? Item.nameAr : Item.nameEn}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  const renderMessages = () => {
    return (
      <div className="max-w-[960px] md:max-w-[90%] lg:max-w-[70%] md:min-w-[350px] lg:max-w-[728px] mx-auto w-full px-4 md:[padding-left:0.8rem]  lg:[padding-left:0.7rem] lg:pr-[unset]  py-6 flex flex-col justify-end space-y-6 min-h-[100%]">
        {messages.map((message) => (
          <div className="w-full">
            {message.isUser &&
              userMessageAttachedFiles[message.id]?.length > 0 && (
                <div className="bottom-[5.5rem] right-[2.7rem] flex justify-end items-end gap-3 max-w-[90%] md:max-w-[95%] lg:max-w-[95%]">
                  <AttachedFilesPreview
                    files={userMessageAttachedFiles[message.id]}
                    themeColor={themeColors}
                    DeleteIcontoshow={false}
                    classname="flex flex-col justify-end overflow-x-auto items-end gap-2 "
                    onDownload={downloadStoredAttachment}
                  />
                </div>
              )}
            <motion.div
              key={message.id}
              variants={messageVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              layout
              className={twMerge(
                "relative flex items-start gap-3 mb-6",
                message.isUser ? "justify-end" : "justify-start",
                userMessageAttachedFiles[message.id]?.length > 0 ? "mt-2" : ""
              )}
            >
              {!message.isUser && (
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: themeColors.primary }}
                >
                  <AiStarsIcon
                    className="w-4 h-4"
                    fill="white"
                    stroke="white"
                  />
                </div>
              )}
              <div className={`flex flex-col gap-2 max-w-[80%] `}>
                <div
                  className={twMerge(
                    " min-w-[min-content] p-4 text-white rounded-tl-2xl rounded-bl-2xl rounded-br-2xl",
                    message.isUser
                      ? ""
                      : "border border-[#EAECF0] text-black"
                  )}
                  style={
                    message.isUser
                      ? {
                          backgroundColor: themeColors.primary,
                          position: "relative",
                          zIndex: 1,
                          isolation: "isolate",
                          boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
                        }
                      : {
                          backgroundColor: "#FFFFFF",
                          borderColor: "#EAECF0",
                          position: "relative",
                          zIndex: 1,
                          isolation: "isolate",
                          boxShadow: "none",
                        }
                  }
                >
                  <div
                    className={twMerge(
                      " text-sm prose prose-sm max-w-none",
                      message.isUser ? "prose-invert" : "prose-gray"
                    )}
                  >
                    {/* <ReactMarkdown
                    rehypePlugins={[rehypeRaw]}
                    components={markdownComponents}
                  >
                  {message.text}
                   </ReactMarkdown> */}
                    <SmartMarkdownRenderer
                      content={message.text}
                      components={markdownComponents}
                      imageComponents={markdownComponentsForImg}
                    />
                  </div>
                  {message.actionButtons?.buttons &&
                    RenderDownloadButton(
                      message.actionButtons.buttons.filter(
                        (button) => button.actionButtonType === "download"
                      )
                    )}
                  {chartsState[Number(message.id)]?.chartDisplay &&
                    !message.isUser &&
                    DisplayCharts(message)}
                </div>

                <div className="flex items-center gap-3 max-w-[100%]">
                  {!message.isUser && renderMessageActions(message)}
                  <div
                    className={twMerge(
                      "text-[10px] text-[#98A2B3]",
                      !message.isUser ? "ms-auto" : ""
                    )}
                  >
                    {message.timestamp.toLocaleTimeString(
                      IsArabicLanguage ? "ar-AE-u-nu-arab" : undefined,
                      {
                        hour: "2-digit",
                        minute: "2-digit",
                      }
                    )}
                  </div>
                </div>
                {message.actionButtons?.buttons &&
                  renderActionButtons(message.actionButtons.buttons)}
              </div>
              {message.isUser && (
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                  <UserAvatarIcon
                    url={userAvatarUrl}
                    base64={userAvatarBase64}
                    size={20}
                  />
                </div>
              )}
            </motion.div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
    );
  };
  const renderServiceView = (service: ServiceViewModel) => {
    return (
      <div
        className={`w-full max-w-[1200px] mx-auto ${
          messages.length == 0 ? "px-8" : "px-0"
        }  py-8`}
      >
        {messages.length === 0 && (
          <>
            {/* Header */}
            <div className=" text-center w-full mb-12">
              <div className="flex items-center justify-center gap-2 mb-2">
                <h1
                  style={{ color: themeColors.primary }}
                  className="text-[25px] md:text-[40px] font-semibold"
                >
                  {service.title}
                </h1>
                <AiStarsIcon
                  stroke={themeColors.primary}
                  color={themeColors.secondary}
                  className="w-8 h-8 -mt-[2.5rem]"
                  style={{}}
                />
              </div>
              <p className="text-[14px] text-base text-gray-600 max-w-[720px] mx-auto">
                {service.description}
              </p>
            </div>

            {/* Questions Grid */}
            <div className="grid grid-cols-2 gap-4 max-w-[720px] mx-auto">
              {service.questions.map((question) => (
                <button
                  key={question.id}
                  onClick={() => handleQuestionClick(question.questionEn)}
                  className={twMerge(
                    "relative bg-white border text-left transition-all duration-200 rounded-xl overflow-hidden",
                    "hover:shadow-[0_8px_24px_rgba(198,167,93,0.18)]",
                    "hover:border-[var(--hover-border)] p-5"
                  )}
                  style={
                    {
                      "--hover-border": themeColors.primary,
                    } as React.CSSProperties
                  }
                >
                  <div
                    className="absolute top-0 left-0 w-full h-[4.5px] "
                    style={{
                      background: `linear-gradient(to right, ${themeDarker}, ${themeColors.secondary})`,
                    }}
                  />
                  <p className="text-xs text-gray-600">
                    {IsArabicLanguage
                      ? question.questionAr
                      : question.questionEn}
                    <span
                      className={`ml-1 inline-flex items-center relative ${
                        IsArabicLanguage ? "top-[4px]" : "top-[5px]"
                      }`}
                      style={{ color: themeColors.primary }}
                    >
                      <GoArrowRightIcon
                        className={`w-4 h-4  ${
                          IsArabicLanguage ? " rotate-180" : ""
                        }`}
                        strokeWidth={0}
                      />
                    </span>
                  </p>
                </button>
              ))}
            </div>
          </>
        )}

        {/* Messages Section - Rendered only if messages exist */}
        {messages.length > 0 && (
          <>
            {renderShareChatButton()}
            {renderMessages()}
          </>
        )}
      </div>
      // NOTE: renderChatInput is called outside this function now
    );
  };

  const renderShareChatButton = () => {
    if (!canShowShareChat) return null;

    return (
      <div className="sticky top-0 z-10 flex justify-end px-4 pt-3">
        <button
          type="button"
          onClick={() => setIsShareModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-full border border-[#EAECF0] bg-white px-4 py-2 text-sm font-medium text-[#344054] shadow-sm hover:bg-gray-50"
          aria-label={t("ShareChat")}
          title={t("ShareChat")}
        >
          <UserGroupIcon className="h-4 w-4" style={{ color: themeColors.primary }} />
          <span>{t("ShareChat")}</span>
        </button>
      </div>
    );
  };

  const renderHeader = () => (
    <div className=" flex items-center justify-between px-4 py-3 border-b border-[#EAECF0]">
      <div className="flex items-center gap-2">
        <WeaveAiLogo className="h-8 w-auto" />
        <span className="text-[#101828] font-semibold">Weave AI</span>
      </div>
      <div className="flex items-center gap-2">
        <button className="p-2 hover:bg-gray-100 rounded-lg">
          <MagnifyingGlassIcon className="w-5 h-5 text-[#667085]" />
        </button>
        <button className=" p-2 hover:bg-gray-100 rounded-lg">
          <UserGroupIcon className="w-5 h-5 text-[#667085]" />
        </button>
      </div>
    </div>
  );

  const AddHistoryItemChatSession = useCallback(async (chatSession: ChatSession) => {
    setChatBasedLoaderFlag((prev) => ({
      ...prev,
      [chatSession.id]: false,
    }));
  }, []);

  const parseStoredAttachments = (
    value: unknown
  ): StoredChatAttachment[] => {
    if (!value) return [];

    let parsed = value;
    if (typeof parsed === "string") {
      try {
        parsed = JSON.parse(parsed);
      } catch {
        return [];
      }
    }

    if (!Array.isArray(parsed)) return [];

    return parsed.flatMap((item): StoredChatAttachment[] => {
      if (!item || typeof item !== "object") return [];
      const record = item as Record<string, unknown>;
      const id = Number(record.id ?? record.attachmentId ?? record.attachment_id);
      const fileName = String(
        record.fileName ?? record.file_name ?? record.originalFileName ?? record.original_file_name ?? ""
      ).trim();
      if (!Number.isFinite(id) || id <= 0 || !fileName) return [];
      return [{
        id,
        fileName,
        mimeType: typeof (record.mimeType ?? record.mime_type) === "string"
          ? String(record.mimeType ?? record.mime_type)
          : null,
        sizeBytes: Number.isFinite(Number(record.sizeBytes ?? record.size_bytes))
          ? Number(record.sizeBytes ?? record.size_bytes)
          : null,
      }];
    });
  };

  const downloadStoredAttachment = async (attachment: StoredChatAttachment) => {
    try {
      const backendService = new BackendService(apiConfig.baseUrl, apiConfig.headers);
      const blob = await backendService.downloadChatAttachment(attachment.id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = attachment.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (downloadError) {
      console.error("Unable to download chat attachment:", downloadError);
      setAttachmentError(
        IsArabicLanguage
          ? "تعذر تنزيل المرفق. يرجى المحاولة مرة أخرى."
          : "Unable to download the attachment. Please try again."
      );
    }
  };

  const fetchChatHistoryDetail = async (chatSession: ChatSession) => {
    IsMobile && setIsSidebarCollapsed(true);
    setAttachedFiles([]);
    const backendService = new BackendService(
      apiConfig.baseUrl,
      apiConfig.headers
    );
    const response = await backendService.getChatHistoryDetail(chatSession.id);
    // Handle the chatHistoryDetails as needed
    if (response.success && response.data) {
      const service =
        chatSession.serviceId > 0
          ? startupData?.allServices.find((item) => item.id === chatSession.serviceId)
          : undefined;

      if (service) {
        const viewModel = mapServiceToViewModel(
          service,
          String(service.categoryId ?? ''),
          service.questions
        );
        setActiveService(viewModel);
        setChatIsActiveService(!!service.active);
        if (service.suggestions) setServiceSuggestions(service.suggestions);
        else setServiceSuggestions([]);
        chatService.current = createN8nChatService(service.webHookUrl);
      } else if (startupData?.generalChatWebhookUrl) {
        setActiveService(null);
        setChatIsActiveService(false);
        chatService.current = createN8nChatService(startupData.generalChatWebhookUrl);
      }

      const chatHistoryDetails = response.data.map((detail) => ({
          id: String(detail.id ?? `${chatSession.id}-${detail.createdDate}`),
          text: normalizeMessageText(detail.message),
          isUser: detail.userMessage,
          liked: detail.liked,
          disliked: detail.disliked,
          timestamp: new Date(detail.createdDate),
        }));

      const restoredAttachments = response.data.reduce<Record<string, AttachmentPreviewFile[]>>(
        (attachments, detail) => {
          const isUserMessage =
            detail.userMessage === true || String(detail.userMessage) === "true";
          if (!isUserMessage) return attachments;

          const storedFiles = parseStoredAttachments(
            detail.attachments ?? detail.attachmentJson ?? (detail as any).attachment_json
          );
          if (storedFiles.length > 0) {
            attachments[String(detail.id ?? `${chatSession.id}-${detail.createdDate}`)] = storedFiles;
          }
          return attachments;
        },
        {}
      );

      const restoredCharts = response.data.reduce<Record<number, ChartState>>(
        (charts, detail) => {
          const isUserMessage =
            detail.userMessage === true || String(detail.userMessage) === "true";
          const chartJson = detail.chartJson ?? (detail as any).chart_json;
          if (isUserMessage || !chartJson) return charts;

          let storedChart: any = chartJson;
          if (typeof storedChart === "string") {
            try {
              storedChart = JSON.parse(storedChart);
            } catch {
              return charts;
            }
          }

          if (storedChart?.chartDisplay && storedChart?.chartData) {
            charts[detail.id] = {
              chartDisplay: true,
              chartType: Number(storedChart.chartType),
              altType: Array.isArray(storedChart.altType)
                ? storedChart.altType.map(Number)
                : [1, 12, 13],
              chartData: storedChart.chartData,
              messageID: detail.id,
            };
          }
          return charts;
        },
        {}
      );

      // Replace existing messages instead of appending
      // console.log(ChatBasedLoaderFlag[response.data?.[0]?.chatSessionId])
      setIsAiResponding(ChatBasedLoaderFlag[response.data?.[0]?.chatSessionId]);
      setIsMessageSubmited(
        ChatBasedLoaderFlag[response.data?.[0]?.chatSessionId]
      );
      setMessages(chatHistoryDetails);
      setUserMessageAttachedFiles(restoredAttachments);
      setChartsState(restoredCharts);
      setActiveChatSessionId(chatSession.id);
      localStorage.setItem(
        "ActiveChatSessionId",
        String(chatSession.id ?? '')
      );
      chatService.current?.setSessionId(chatSession.chatSessionId);
      setActiveN8nSessionId(chatSession.chatSessionId);
      chatService.current?.setweaveChatid(chatSession.id);
    } else {
      console.error("Expected an array but got:", response);
    }
    setUserHasStartedChat(true);
    if (chatSession.service?.active) setChatIsActiveService(true);
    else if (!chatSession.serviceId) setChatIsActiveService(false);
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-100">
        <div className="flex flex-col items-center">
          <div
            className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2"
            style={{ borderColor: themeColors.primary }}
          ></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (error || !startupData) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-100">
        <div className="  text-center">
          <p className="text-red-600 mb-4">
            {error || "Failed to initialize application"}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 text-white rounded transition-colors"
            style={{ backgroundColor: buttonColor }}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            {t("Retry")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className={twMerge(
        " weave-ai-chat relative flex h-full w-full max-h-full ",
        className
      )}
    >
      <Sidebar
        ref={sidebarRef}
        onServiceSelect={handleServiceClick}
        onOpenDashboard={handleOpenDashboard}
        onOpenEditor={handleOpenEditor}
        onExploreServices={() => {
          setIsExploringServices(true);
          SetIsMobilePinedServicesToShow(false);
          IsMobile && setIsSidebarCollapsed(true);
          setAttachedFiles([]);
        }}
        onToggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        isCollapsed={isSidebarCollapsed}
        themeColors={themeColors}
        isExploreServicesVisible={categories?.length > 0 ? true : false}
        onMobilePinnedServicesCLicked={onMobilePinnedServicesCLicked}
        AddHistoryItemChatSession={AddHistoryItemChatSession}
        t={t}
        IsArabicLanguage={IsArabicLanguage}
        mobilePaddingBottom={mobilePaddingBottom}
        mobilePaddingTop={mobilePaddingTop}
        toggleIcon={
          <div
            className="flex items-center justify-center w-5 h-5"
            style={{ color: themeColors.primary }}
          >
            {IsMobile && (
              <div className="fixed">
                <LineMenuIcon className="h-7 w-7" />
              </div>
            )}

            {!IsMobile &&
              ((IsArabicLanguage ? !isSidebarCollapsed : isSidebarCollapsed) ? (
                <ExpandIcon
                  className="w-5 h-5"
                  style={{ stroke: "currentColor", fill: "none" }}
                  preserveAspectRatio="xMidYMid meet"
                  viewBox="0 0 25.5 21.5"
                />
              ) : (
                <CollapseIcon
                  className="w-5 h-5"
                  style={{ stroke: "currentColor", fill: "none" }}
                  preserveAspectRatio="xMidYMid meet"
                  viewBox="0 0 25.5 21.5"
                />
              ))}
          </div>
        }
        userPinnedServices={startupData?.userPinnedServices || []}
        apiConfig={apiConfig}
        chatUiFeatures={chatUiFeatures}
        currentUserEmail={userEmail}
        currentUser={currentUser}
        onLogout={onLogout}
        activeShareServiceId={activeService?.id}
        onHistoryItemSelect={fetchChatHistoryDetail}
        handlePinClick={handlePinClick}
        IsMobile={IsMobile}
      />
      <div
        className={twMerge(
          `flex-1 flex flex-col transition-all duration-300 overflow-hidden bg-white`,
          isSidebarCollapsed ? "ml-0" : "",
          !IsMobile && "pt-3"
        )}
        style={{
          background: "white",
          ...(IsMobile && {
            paddingTop: mobilePaddingTop,
            paddingBottom: mobilePaddingBottom,
          }),
        }}
      >
        {(messages.length > 0 || userHasStartedChat) && (
          <img
            src={MOF_BRANDMARK_SRC}
            alt=""
            className="emblem-watermark"
            style={{ left: isSidebarCollapsed ? "50%" : "calc(50% + 165px)" }}
          />
        )}
        <div id="AIServicesClose">
          {IsMobile
            ? isAIServicesCloseButtonVisible &&
              isSidebarCollapsed && (
                <div
                  id="AIServicesClose"
                  className={`absolute   ${
                    IsArabicLanguage ? "left-5" : "right-5"
                  }`}
                >
                  <button
                    onClick={() => onViewAIServicesClose()}
                    className="p-2 bg-white/80 hover:bg-white/80 rounded-full transition-colors"
                  >
                    <XMarkIcon className="w-6 h-6 text-gray-500" />
                  </button>
                </div>
              )
            : isAIServicesCloseButtonVisible && (
                <div
                  className={`absolute top-4 ${
                    IsArabicLanguage ? "left-8" : "right-8"
                  }`}
                >
                  <button
                    onClick={() => onViewAIServicesClose()}
                    className="p-2 bg-white/80 hover:bg-white/80 rounded-full transition-colors"
                  >
                    <XMarkIcon className="w-6 h-6 text-gray-500" />
                  </button>
                </div>
              )}
        </div>
        {isExploringServices ? (
          <motion.div
            className="flex-1 overflow-y-auto bg-white"
            style={{
              background: "white",
              marginTop: IsMobile ? "60px" : "auto",
            }}
          >
            {!IsMobilePinedServicesToShow ? (
              <div className=" w-full max-w-[1200px] mx-auto  px-8 py-8 pt-12">
                <motion.div
                  variants={UpsideDownVariant}
                  initial="hidden"
                  animate="visible"
                >
                  {" "}
                  {/* Header */}
                  <div className="relative mb-6">
                    <button
                      type="button"
                      onClick={() => setIsExploringServices(false)}
                      className="absolute top-0 start-0 inline-flex items-center gap-1.5 text-sm text-[#667085] hover:text-[#101828] transition-colors"
                    >
                      <span aria-hidden>{IsArabicLanguage ? "→" : "←"}</span>
                      {t("Back")}
                    </button>
                    {renderHeaderControls(
                      `absolute top-0 ${IsArabicLanguage ? "left-0" : "right-0"}`,
                    )}
                    <div className="text-center w-full pt-8">
                      <h1
                        className="sm:text-[25px] md:text-[32px] font-bold text-gray-900 mb-2"
                        style={{ marginTop: IsMobile ? "10px" : "8px" }}
                      >
                        {t("exploreServices")}
                      </h1>
                      <p className="text-sm text-gray-500 max-w-lg mx-auto">
                        {t("BrowseTheServicesAndSearchMsg")}
                      </p>
                    </div>
                  </div>
                  {/* Search */}
                  <div className="mb-6 max-w-[900px] mx-auto px-4">
                    <div className="relative">
                      <div
                        className={`absolute top-1/2 transform -translate-y-1/2 ${
                          IsArabicLanguage ? "right-4" : "left-4"
                        }`}
                      >
                        <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        placeholder={t("SearchServicesWithDots")}
                        value={searchQuery ?? ""}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={`w-full py-3.5 bg-white rounded-2xl text-gray-900 placeholder-gray-500 text-base transition-all focus:outline-none focus:ring-0 ${
                          IsArabicLanguage ? "pr-12" : "pl-12"
                        }`}
                        style={{
                          border: "1.5px solid rgba(198, 167, 93, 0.5)",
                          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.04)",
                        }}
                      />
                    </div>
                  </div>
                </motion.div>
                {/* Tabs */}

                <motion.div
                  variants={{
                    ...BottomUpVariant,
                    visible: {
                      ...BottomUpVariant.visible,
                      transition: {
                        ...BottomUpVariant.visible.transition,
                        duration: 0.3,
                        delay: 0.2,
                      },
                    },
                  }}
                  initial="hidden"
                  animate={
                    (animate as React.CSSProperties) ? "visible" : "hidden"
                  }
                  className="mb-5 max-w-[900px] mx-auto px-4"
                >
                  <nav className=" flex space-x-10 border-b border-[#EAECF0] overflow-auto">
                    {categories.map((category) => (
                      <button
                        key={category.nameEn}
                        onClick={() => setActiveTab(category.nameEn)}
                        className="group relative"
                      >
                        <div
                          className={twMerge(
                            "whitespace-nowrap overflow-hidden text-ellipsis flex items-center gap-2 py-3 font-medium text-sm transition-colors duration-200",
                            activeTab === category.nameEn
                              ? ""
                              : "text-[#475467]" // Only set inactive color with Tailwind
                          )}
                          style={{
                            color:
                              activeTab === category.nameEn
                                ? themeColors.primary
                                : undefined, // Apply primary color for active tab
                          }}
                        >
                          {IsArabicLanguage ? category.nameAr : category.nameEn}
                        </div>
                        {activeTab === category.nameEn && (
                          <div
                            className="absolute bottom-0 left-0 w-full h-0.5"
                            style={{
                              background: `linear-gradient(to right, ${themeColors.primary}, ${themeColors.secondary})`,
                            }}
                          />
                        )}
                      </button>
                    ))}
                  </nav>
                </motion.div>

                {/* Services Grid */}
                <motion.div
                  variants={{
                    ...BottomUpVariant,
                    hidden: { ...BottomUpVariant.hidden, y: 60, opacity: 0 },
                    visible: {
                      ...BottomUpVariant.visible,
                      transition: {
                        ...BottomUpVariant.visible.transition,
                        duration: 0.35,
                        delay: 0.6,
                      },
                    },
                  }}
                  initial="hidden"
                  animate={
                    (animate as React.CSSProperties) ? "visible" : "hidden"
                  }
                  className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-[900px] mx-auto px-4"
                >
                  {filteredServices.map((service) => {
                    const isPinned = startupData?.userPinnedServices.some(
                      (pinned) => pinned.id === service.id
                    );
                    const isPinning = pinningServiceId === service.id;
                    const showPin = canShowServicePin(service);

                    return (
                      <button
                        key={service.id}
                        onClick={() => handleServiceClick(service.id)}
                        className={`service-card floating-card flex flex-col items-center text-center group relative ${
                          IsArabicLanguage ? "text-right" : ""
                        }`}
                        onMouseEnter={() => setIsHovered(service.id)}
                        onMouseLeave={() => setIsHovered(null)}
                      >
                        <div className="flex-1 w-full px-1 pt-2">
                          <div
                            className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-[14px]"
                            style={{
                              background: "rgba(198, 167, 93, 0.12)",
                              color: themeColors.primary,
                            }}
                          >
                            {getExploreServiceIcon(service)}
                          </div>
                          <h3
                            className="text-xl font-semibold mb-1.5 transition-colors text-gray-900"
                            style={{ fontWeight: 600 }}
                          >
                            {service.title}
                          </h3>
                          <p className="text-base leading-relaxed text-gray-600" style={{ fontWeight: 400 }}>
                            {service.description}
                          </p>
                        </div>
                        {showPin && (
                        <div
                          className={`absolute top-4 ${
                            IsArabicLanguage ? "left-4" : "right-4"
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePinClick(service.id, isPinned);
                          }}
                        >
                          <div className="p-1.5 transition-all cursor-pointer">
                            {isPinning ? (
                              <div
                                className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
                                style={{
                                  borderColor: themeColors.primary,
                                  borderTopColor: "transparent",
                                }}
                              />
                            ) : isPinned ? (
                              <PinnedActiveIcon
                                className="w-4 h-4 transition-colors"
                                style={{ color: themeColors.primary }}
                              />
                            ) : (
                              <PinnedInactiveIcon
                                className="w-4 h-4 transition-colors"
                                style={{
                                  stroke: themeColors.primary,
                                  fill: "none",
                                  transform: "scale(0.8)",
                                }}
                                preserveAspectRatio="xMidYMid meet"
                                viewBox="0 0 17.992 18.028"
                              />
                            )}
                          </div>
                        </div>
                        )}
                      </button>
                    );
                  })}
                </motion.div>
              </div>
            ) : (
              /* User Pinned Services */
              <div className=" w-full max-w-[1200px] mx-auto pl-[-80px] px-4 py-8 f">
                <div className="flex mt-[-8px] flex-col mb-15 gap-5 items-center justify-center align-center">
                  <h1 className="font-bold">Pinned Services</h1>
                  <div className="grid grid-cols-1  gap-4 max-w-[720px] mx-auto">
                    {startupData?.userPinnedServices.map((service) => {
                      // const isPinned = startupData?.userPinnedServices.some(
                      //   (pinned) => pinned.id === service.id
                      // );
                      return (
                        <button
                          key={service.id}
                          onClick={() => handleServiceClick(service.id)}
                          className="service-card floating-card flex items-start text-left group relative"
                          style={{
                            borderColor:
                              isHovered === service.id
                                ? themeColors.primary
                                : undefined,
                          }}
                          onMouseEnter={() => setIsHovered(service.id)}
                          onMouseLeave={() => setIsHovered(null)}
                        >
                          <div className="flex-1 pr-8">
                            <h3
                              className="text-base font-bold text-[13px] text-gray-900 transition-colors"
                              style={{
                                color: "inherit", // Inherit color from parent button
                              }}
                            >
                              {service.nameEn}
                            </h3>
                            <p className="mt-1 text-xs text-gray-600 leading-normal">
                              {service.descriptionEn}
                            </p>
                          </div>
                          <div
                            className="absolute top-4 right-4"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePinClick(service.id, true);
                            }}
                          >
                            {/* <div className="p-1.5 transition-all cursor-pointer">
                          {isPinning ? (
                            <div
                              className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin"
                              style={{
                                borderColor: themeColors.primary,
                                borderTopColor: 'transparent',
                              }}
                            />
                          ) : isPinned ? (
                            <PinnedActiveIcon
                              className="w-4 h-4 transition-colors"
                              style={{
                                stroke: themeColors.primary,
                                fill: 'none',
                                transform: 'scale(0.8)',
                              }}
                              preserveAspectRatio="xMidYMid meet"
                              viewBox="0 0 17.992 18.028"
                            />
                          ) : (
                            <PinnedInactiveIcon
                              className="w-4 h-4 transition-colors"
                              style={{
                                stroke: 'currentColor',
                                fill: 'none',
                                transform: 'scale(0.8)',
                              }}
                              preserveAspectRatio="xMidYMid meet"
                              viewBox="0 0 17.992 18.028"
                            />
                          )}
                        </div> */}
                            <PinnedActiveIcon
                              className="w-5 h-5 transition-colors"
                              style={{ color: themeColors.primary }}
                            />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        ) : (
          <>
            <div></div>
            <motion.div
              className="flex-1 overflow-y-auto bg-white"
              style={{
                background: "white",
                marginTop: IsMobile ? "60px" : 0,
              }}
            >
              {activeService != null && !userHasStartedChat && (
                <img
                  src={MOF_BRANDMARK_SRC}
                  alt=""
                  className="emblem-watermark"
                  style={{ left: isSidebarCollapsed ? "50%" : "calc(50% + 165px)" }}
                />
              )}
              {activeService != null ? (
                <div className="h-full w-full flex flex-col justify-content-center ">
                  <div className="min-h-[50%] flex flex-col justify-content-end">
                    {renderServiceView(activeService)}
                  </div>
                  {!userHasStartedChat && (
                    <div className="min-w-[100%] flex flex-col px-4 ">
                      <div className="min-w-[100%]">
                        {renderChatInput(true)}
                      </div>
                      {Servicesuggestions.length > 0 && (
                        <div className="min-w-[100%]">
                          {RenderRecommendationItems(true)}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : messages.length === 0 && !userHasStartedChat ? (
                <div className="h-full min-h-0 flex flex-col bg-white">
                    <div
                      className={`flex-shrink-0 flex px-6 pt-4 pb-2 ${
                        IsArabicLanguage ? "justify-start" : "justify-end"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <NotificationBell
                          isArabic={IsArabicLanguage}
                          userEmail={userEmail}
                          apiConfig={apiConfig}
                          themeColors={themeColors}
                          onSelectNotification={handleNotificationSelect}
                          onOpenShared={() => sidebarRef.current?.openChatById("")}
                        />
                        {onLanguageChange && (
                          <LanguageToggle
                            isArabic={IsArabicLanguage}
                            onChange={onLanguageChange}
                            themeColors={themeColors}
                          />
                        )}
                      </div>
                    </div>
                  <div className="flex-1 flex flex-col items-center justify-center min-h-0 overflow-y-auto px-6 py-4">
                    <div className="max-w-[1100px] w-full mx-auto">
                      <div className="mb-8 text-center">
                        <div className="flex items-center justify-center mb-6">
                          <img
                            src={MOF_BRANDMARK_SRC}
                            alt="UAE Ministry of Finance"
                            className="h-28 object-contain"
                          />
                        </div>
                        <h1 className="text-4xl font-semibold text-gray-900">
                          {homeGreeting}
                        </h1>
                      </div>

                      <div className="mb-10 max-w-[800px] mx-auto">
                        {renderChatInput(true)}
                      </div>

                      <div className="mb-6 py-2 overflow-visible">
                        <p className="text-[11px] font-semibold tracking-[0.14em] text-[#98A2B3] uppercase text-center mb-4">
                          {IsArabicLanguage ? "الخدمات المقترحة" : "Suggested Services"}
                        </p>
                        <div
                          className="flex overflow-x-auto gap-4 pb-3 pt-2 snap-x snap-mandatory scrollbar-hide justify-center"
                          style={{
                            scrollbarWidth: "none",
                            msOverflowStyle: "none",
                            overflowY: "visible",
                          }}
                        >
                          {(
                            () => {
                              const findHomeService = (matchers: string[]) => {
                                const all = [
                                  ...(startupData?.allServices || []),
                                  ...(startupData?.categories?.flatMap(
                                    (cat) => cat.services,
                                  ) || []),
                                ];
                                return all.find((svc) =>
                                  matchers.some((m) =>
                                    svc.nameEn?.toLowerCase().includes(m),
                                  ),
                                );
                              };
                              const docQaService = findHomeService([
                                "document q&a",
                                "document qa",
                                "q&a",
                              ]);
                              const proposalService = findHomeService([
                                "proposal",
                              ]);

                              return (
                                <>
                          <button
                            onClick={() => {
                              if (docQaService) {
                                handleServiceClick(docQaService.id);
                              } else {
                                setIsExploringServices(true);
                              }
                            }}
                            className="service-card floating-card flex-shrink-0 w-[300px] flex flex-col items-center text-center snap-start relative hover:z-10"
                            style={{ minHeight: "170px", padding: "1.25rem" }}
                          >
                            <div
                              className="w-10 h-10 rounded-full flex items-center justify-center mb-3"
                              style={{
                                backgroundColor: `${themeColors.primary}22`,
                                color: themeColors.primary,
                              }}
                            >
                              <DocumentTextIcon className="w-5 h-5" />
                            </div>
                            <div className="flex-1 w-full">
                              <h3
                                className="text-lg font-semibold text-gray-900 mb-2"
                                style={{ fontWeight: 600 }}
                              >
                                {IsArabicLanguage
                                  ? "سؤال وجواب حول المستندات"
                                  : "Document Q&A"}
                              </h3>
                              <p
                                className="text-sm text-gray-600 leading-snug"
                                style={{ fontWeight: 400 }}
                              >
                                {IsArabicLanguage
                                  ? "ارفع مستنداتك واطرح أسئلتك للحصول على إجابات فورية"
                                  : "Upload your documents and ask questions to get instant answers."}
                              </p>
                            </div>
                          </button>

                          <button
                            onClick={() => {
                              if (proposalService) {
                                handleServiceClick(proposalService.id);
                              } else {
                                setIsExploringServices(true);
                              }
                            }}
                            className="service-card floating-card flex-shrink-0 w-[300px] flex flex-col items-center text-center snap-start relative hover:z-10"
                            style={{ minHeight: "170px", padding: "1.25rem" }}
                          >
                            <div
                              className="w-10 h-10 rounded-full flex items-center justify-center mb-3"
                              style={{
                                backgroundColor: `${themeColors.primary}22`,
                                color: themeColors.primary,
                              }}
                            >
                              <ClipboardDocumentCheckIcon className="w-5 h-5" />
                            </div>
                            <div className="flex-1 w-full">
                              <h3
                                className="text-lg font-semibold text-gray-900 mb-2"
                                style={{ fontWeight: 600 }}
                              >
                                {IsArabicLanguage
                                  ? "تقييم طلبات العروض والمقترحات"
                                  : "RFP & Proposal Evaluation"}
                              </h3>
                              <p
                                className="text-sm text-gray-600 leading-snug"
                                style={{ fontWeight: 400 }}
                              >
                                {IsArabicLanguage
                                  ? "ملخص طلب العروض، ثم تقييم وترتيب المقترحات واختيار الأنسب"
                                  : "RFP summary, then evaluate and rank submitted proposals with a best-fit pick."}
                              </p>
                            </div>
                          </button>

                          <button
                            onClick={() => setIsExploringServices(true)}
                            className="service-card floating-card flex-shrink-0 w-[300px] flex flex-col items-center text-center snap-start relative hover:z-10"
                            style={{
                              minHeight: "170px",
                              padding: "1.25rem",
                            }}
                          >
                            <div
                              className="w-10 h-10 rounded-full flex items-center justify-center mb-3"
                              style={{
                                backgroundColor: `${themeColors.primary}22`,
                                color: themeColors.primary,
                              }}
                            >
                              <Squares2X2Icon className="w-5 h-5" />
                            </div>
                            <div className="flex items-center gap-2">
                              <span
                                className="text-lg font-semibold text-gray-700"
                                style={{ fontWeight: 600 }}
                              >
                                {t("exploreServices")}
                              </span>
                              <svg
                                className={twMerge(
                                  "w-5 h-5 text-gray-700",
                                  IsArabicLanguage && "rotate-180",
                                )}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M9 5l7 7-7 7"
                                />
                              </svg>
                            </div>
                            <p
                              className="text-xs text-gray-500 mt-2"
                              style={{ fontWeight: 400 }}
                            >
                              {IsArabicLanguage
                                ? "عرض المزيد من الخدمات"
                                : "View more services"}
                            </p>
                          </button>
                                </>
                              );
                            }
                          )()}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {renderShareChatButton()}
                  {renderMessages()}
                </>
              )}
            </motion.div>

            {/* Chat Input Area (Fixed at the bottom) */}
            {userHasStartedChat && (
              <div className="px-4 pb-3">
                {/* Sugessions Ui Layout */}
                {/* {Servicesuggestions.length > 0 &&
                      <div className='px-1 flex flex-col items-start justify-start gap-2 max-w-[720px] mx-auto max-w-full md:max-w-[90%] lg:max-w-[720px] md:min-w-[350px] lg:min-w-[720px] mx-auto relative '>
                        <span className='font-bold text-sm'>Sugessions</span>
                        {Servicesuggestions.map((item, index) => {
                          return (
                            <div key={item.id}
                             onClick={() => { setInputValue(IsArabicLanguage ? item.nameAr : item.nameEn);  }}
                              className="inline-block text-sm font-medium px-4 py-2 rounded-lg cursor-pointer transition-colors duration-200"
                              style={{
                                backgroundColor: themeColors.accent,
                                color: themeColors.primary,
                              }}
                            >
                              <span className="flex items-start gap-1">
                                <AiStarsIcon
                                  stroke={themeColors.primary}
                                  color={themeColors.primary}
                                  fill={themeColors.primary}
                                  className="w-3 h-3"
                                />
                                <span className="leading-tight font-semibold">
                                 {IsArabicLanguage? item.nameAr:item.nameEn}
                                </span>
                              </span>
                            </div>
                          )
                        })
                        }
                      </div>
                    } */}
                {renderChatInput(true)}
              </div>
            )}
          </>
        )}
      </div>

      {/* Chart Modal */}
      {RenderChartFullScreen()}

      <ShareChatModal
        isOpen={isShareModalOpen}
        sessionId={Number(ActiveChatSessionId)}
        clientSessionId={chatService.current?.getSessionId() || activeN8nSessionId}
        serviceId={activeService?.id}
        apiConfig={apiConfig}
        themeColors={themeColors}
        isArabicLanguage={IsArabicLanguage}
        t={t}
        onClose={() => setIsShareModalOpen(false)}
        onShared={() => setIsShareModalOpen(false)}
        onSessionResolved={(resolvedSessionId) => {
          localStorage.setItem("ActiveChatSessionId", String(resolvedSessionId));
          setActiveChatSessionId(resolvedSessionId);
          chatService.current?.setweaveChatid(resolvedSessionId);
        }}
      />
    </motion.div>
  );
};

interface SmartMarkdownRendererProps {
  content: unknown;
  components: Components;
  imageComponents: Components;
}

export const SmartMarkdownRenderer: React.FC<SmartMarkdownRendererProps> = ({
  content,
  components,
  imageComponents,
}) => {
  const safeContent = normalizeMessageText(content);
  const imgRegex = /<img\s+[^>]*src=['"]([^'"]+)['"][^>]*\/?>/gi;

  const imgMatches = [...safeContent.matchAll(imgRegex)];
  const imgSrcList = imgMatches.map((match) => match[1]);
  const contentWithoutImages = safeContent.replace(imgRegex, "").trim();
  const hasText = contentWithoutImages.length > 0;
  const hasImages = imgSrcList.length > 0;
  const shouldSplit = hasText && hasImages;
  if (shouldSplit) {
    return (
      <div className="space-y-4">
        <ReactMarkdown rehypePlugins={[rehypeRaw]} components={components}>
          {contentWithoutImages}
        </ReactMarkdown>
        {imgSrcList.map((src, idx) => (
          <img key={idx} src={src} className="rounded-lg max-w-full h-auto" />
        ))}
      </div>
    );
  }

  // fallback to standard markdown render
  return (
    <ReactMarkdown rehypePlugins={[rehypeRaw]} components={components}>
      {safeContent}
    </ReactMarkdown>
  );
};
