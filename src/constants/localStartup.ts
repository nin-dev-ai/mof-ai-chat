import { Service, StartupData, normalizeChatUiFeatures } from '../models/startup';
import { GENERAL_CHAT_WEBHOOK_URL } from './chatConstants';

const makeService = (
  id: number,
  nameEn: string,
  nameAr: string,
  descriptionEn: string,
  descriptionAr: string,
): Service => ({
  id,
  nameEn,
  nameAr,
  descriptionEn,
  descriptionAr,
  webHookUrl: GENERAL_CHAT_WEBHOOK_URL,
  categoryId: 1,
  active: true,
  iconInternal: true,
  iconPath: '',
  questions: [],
  initialMessages: [],
  micRecordingAllowed: true,
  sharable: true,
});

const LOCAL_SERVICES: Service[] = [
  makeService(
    1,
    'Document Q&A',
    'سؤال وجواب حول المستندات',
    'Upload your documents and ask questions to get instant answers.',
    'ارفع مستنداتك واطرح أسئلتك للحصول على إجابات فورية',
  ),
  makeService(
    2,
    'RFP & Proposal Evaluation',
    'تقييم طلبات العروض والمقترحات',
    'RFP summary, then evaluate and rank submitted proposals with a best-fit pick.',
    'لخص طلب تقديم العروض ثم قيّم المقترحات ورتّبها مع اختيار الأنسب.',
  ),
  makeService(
    3,
    'Inquiry Bot',
    'مساعد الاستفسارات',
    'Ask questions about policies, benefits, and guidelines.',
    'اطرح أسئلة حول السياسات والمزايا والإرشادات.',
  ),
  makeService(
    4,
    'Email Drafting',
    'صياغة البريد الإلكتروني',
    'Generate professional email drafts from a short brief.',
    'أنشئ مسودات بريد إلكتروني احترافية من وصف مختصر.',
  ),
  makeService(
    5,
    'Meeting Transcript Summarization',
    'تلخيص محاضر الاجتماعات',
    'Share transcripts and receive structured summaries with action items.',
    'ارفع نص الاجتماع واحصل على ملخص منظم مع المهام.',
  ),
];

export const getLocalStartupData = (): StartupData => ({
  categories: [
    {
      id: 1,
      nameEn: 'General Services',
      nameAr: 'الخدمات العامة',
      active: true,
      iconInternal: true,
      iconPath: '',
      services: LOCAL_SERVICES,
    },
  ],
  userPinnedServices: LOCAL_SERVICES.slice(0, 2),
  pinnedServices: [],
  allServices: LOCAL_SERVICES,
  generalChatWebhookUrl: GENERAL_CHAT_WEBHOOK_URL,
  micRecordingAllowed: true,
  welcomeMessage: '',
  copyAllowed: true,
  likeDisLikeAllowed: true,
  textToSpeechAllowed: false,
  typeSpeedMilliSeconds: 3,
  welcomeMessageAr: '',
  descriptionAr: '',
  descriptionEn: '',
  animation: true,
  webSocketEnabled: true,
  chatUiFeatures: normalizeChatUiFeatures(),
});
