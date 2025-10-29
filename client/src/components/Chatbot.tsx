import { useState } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

export function Chatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: '안녕하세요! 안전 보호구 관련 질문에 답변해드립니다. 사내 규정, 법률, 보호구 사용법 등을 문의해주세요.',
      sender: 'bot',
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');

  const handleSendMessage = () => {
    if (!inputText.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      sender: 'user',
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');

    // 봇 응답 시뮬레이션
    setTimeout(() => {
      const botResponse = getBotResponse(inputText);
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: botResponse,
        sender: 'bot',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, botMessage]);
    }, 500);
  };

  const getBotResponse = (question: string): string => {
    const lowerQuestion = question.toLowerCase();

    if (lowerQuestion.includes('법') || lowerQuestion.includes('법률') || lowerQuestion.includes('법규')) {
      return '산업안전보건법 제49조에 따라 사업주는 근로자가 작업 중 안전모, 안전화 등 보호구를 착용해야 하는 경우 이를 제공하고 착용하도록 해야 합니다. 또한 제138조와 제140조에서는 작업별 필요한 보호구 착용을 의무화하고 있습니다.';
    }

    if (lowerQuestion.includes('헬멧') || lowerQuestion.includes('안전모')) {
      return '안전모(헬멧)는 낙하물이나 추락 위험이 있는 작업장에서 필수입니다. KCS 인증 제품을 사용하시고, 유효기간(제조일로부터 3년)을 확인하세요. 착용 시 턱끈을 반드시 체결해야 합니다.';
    }

    if (lowerQuestion.includes('마스크') || lowerQuestion.includes('호흡기')) {
      return '작업 환경에 따라 적절한 마스크를 선택해야 합니다. 분진 작업장은 방진마스크, 유해가스 발생 장소는 방독마스크를 착용하세요. 필터는 정기적으로 교체해야 하며, 얼굴에 밀착되도록 착용해야 합니다.';
    }

    if (lowerQuestion.includes('안전화') || lowerQuestion.includes('작업화')) {
      return '안전화는 중량물 취급, 날카로운 물체가 있는 작업장에서 필수입니다. 발등 보호를 위한 철심이 있는 제품을 사용하고, 미끄럼 방지 기능이 있는지 확인하세요. 정기적으로 밑창 마모 상태를 점검해야 합니다.';
    }

    if (lowerQuestion.includes('규정') || lowerQuestion.includes('사내')) {
      return '사내 안전 규정에 따라 작업 시작 전 보호구 착용 상태를 점검해야 하며, 미착용 시 작업 금지됩니다. 보호구 파손 시 즉시 교체하고, 개인 보호구는 타인과 공유하지 않습니다.';
    }

    if (lowerQuestion.includes('보호경') || lowerQuestion.includes('안경')) {
      return '보호경은 비산물이나 화학물질로부터 눈을 보호합니다. 용접 작업 시에는 차광도가 적절한 용접용 보호경을, 화학물질 취급 시에는 밀폐형 보호경을 착용하세요.';
    }

    return '질문에 대한 구체적인 답변을 드리기 위해 좀 더 자세히 말씀해 주시겠어요? 보호구 종류, 관련 법규, 착용 방법 등에 대해 문의하실 수 있습니다.';
  };

  return (
    <>
      {/* 챗봇 버튼 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 sm:bottom-8 sm:right-8 w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 rounded-full flex items-center justify-center shadow-xl shadow-cyan-500/30 transition-all z-50 border-2 border-cyan-400/20"
      >
        <div className="relative">
          {isOpen ? <X className="w-5 h-5 sm:w-6 sm:h-6 text-white" /> : <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6 text-white" />}
          {!isOpen && (
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-green-400 rounded-full border-2 border-slate-900 animate-pulse"></div>
          )}
        </div>
      </button>

      {/* 챗봇 창 */}
      {isOpen && (
        <div className="fixed bottom-20 right-4 sm:bottom-28 sm:right-8 w-[calc(100vw-2rem)] sm:w-96 h-[500px] max-h-[calc(100vh-10rem)] bg-slate-900/95 backdrop-blur-md rounded-2xl shadow-2xl flex flex-col z-50 border border-slate-700">
          {/* 헤더 */}
          <div className="bg-gradient-to-r from-cyan-500 to-blue-600 px-4 py-3 rounded-t-2xl">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
              <h3 className="text-white">안전 보호구 도우미</h3>
            </div>
            <p className="text-cyan-100 text-sm">보호구 관련 질문을 해주세요</p>
          </div>

          {/* 메시지 영역 */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] px-4 py-3 rounded-xl ${
                      message.sender === 'user'
                        ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20'
                        : 'bg-slate-800 text-gray-200 border border-slate-700'
                    }`}
                  >
                    <p className="text-sm leading-relaxed">{message.text}</p>
                    <p className="text-xs opacity-70 mt-2">
                      {message.timestamp.toLocaleTimeString('ko-KR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* 입력 영역 */}
          <div className="p-4 border-t border-slate-700">
            <div className="flex gap-2">
              <Input
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="질문을 입력하세요..."
                className="flex-1 bg-slate-800 border-slate-700 text-white placeholder:text-gray-500 focus:border-cyan-500 focus:ring-cyan-500/20"
              />
              <button
                onClick={handleSendMessage}
                className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 rounded-lg transition-all shadow-lg shadow-cyan-500/20"
              >
                <Send className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}