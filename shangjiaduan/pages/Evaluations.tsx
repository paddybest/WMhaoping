import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Evaluation, Tag } from '../types';
import { Trash2, Star, Sparkles, X, Check } from 'lucide-react';

export const Evaluations: React.FC = () => {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [aiGeneratedText, setAiGeneratedText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [evalRes, tagRes] = await Promise.all([
        api.get('/reviews/merchant/all'),
        api.get('/merchant/tags')
      ]);
      setEvaluations(evalRes.data?.data || []);
      setTags(tagRes.data?.data || []);
    } catch {
      setEvaluations([
        { 
          id: 1, 
          user_id: 1, 
          user_nickname: 'Alice', 
          content: '服务很好，食物也很棒！', 
          rating: 5, 
          tags: [{ id: 1, name: '美味' }], 
          created_at: '2023-10-27' 
        }
      ]);
      setTags([{ id: 1, name: '美味' }, { id: 2, name: '新鲜' }, { id: 3, name: '微辣' }]);
    }
  };

  const handleAiGenerate = async () => {
    if (selectedTags.length === 0) return;
    setIsGenerating(true);
    try {
      // Calling the backend proxy which calls Gemini
      const res = await api.post('/reviews/generate', { tags: selectedTags });
      setAiGeneratedText(res.data?.data?.text || '生成的文本将显示在这里。');
    } catch (e) {
      console.error(e);
      // Fallback simulation for demo
      setTimeout(() => {
        setAiGeneratedText(`基于标签 ${selectedTags.join(', ')}，这个地方绝对棒极了！味道正宗，服务一流。强烈推荐！`);
      }, 1000);
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleTag = (tagName: string) => {
    if (selectedTags.includes(tagName)) {
      setSelectedTags(selectedTags.filter(t => t !== tagName));
    } else {
      setSelectedTags([...selectedTags, tagName]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">评价管理</h1>
        <button 
          onClick={() => setIsAiModalOpen(true)}
          className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center shadow-lg shadow-purple-200 transition-all"
        >
          <Sparkles size={18} className="mr-2" />
          AI 生成示例
        </button>
      </div>

      <div className="grid gap-6">
        {evaluations.map((ev) => (
          <div key={ev.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center">
                <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center font-bold text-gray-600 mr-3">
                  {ev.user_nickname[0]}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">{ev.user_nickname}</h3>
                  <div className="flex items-center text-yellow-400 text-xs">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={12} fill={i < ev.rating ? "currentColor" : "none"} className={i < ev.rating ? "" : "text-gray-300"} />
                    ))}
                    <span className="ml-2 text-gray-400">{ev.created_at}</span>
                  </div>
                </div>
              </div>
              <button className="text-gray-400 hover:text-red-500 transition-colors">
                <Trash2 size={18} />
              </button>
            </div>
            <p className="text-gray-700 mb-4">{ev.content}</p>
            <div className="flex flex-wrap gap-2">
              {ev.tags.map(t => (
                <span key={t.id} className="px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-medium">
                  #{t.name}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* AI Modal */}
      {isAiModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-lg transform transition-all">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center text-purple-600">
                <Sparkles className="mr-2" />
                <h2 className="text-xl font-bold">AI 评价生成器</h2>
              </div>
              <button onClick={() => setIsAiModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">选择标签作为生成依据</label>
              <div className="flex flex-wrap gap-2">
                {tags.map(tag => (
                  <button
                    key={tag.id}
                    onClick={() => toggleTag(tag.name)}
                    className={`
                      px-3 py-1.5 rounded-full text-sm font-medium transition-colors border
                      ${selectedTags.includes(tag.name)
                        ? 'bg-purple-100 text-purple-700 border-purple-200'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'}
                    `}
                  >
                    {tag.name}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-6 min-h-[120px] relative">
              {isGenerating ? (
                <div className="absolute inset-0 flex items-center justify-center text-purple-600">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
                </div>
              ) : aiGeneratedText ? (
                <p className="text-gray-800 leading-relaxed">{aiGeneratedText}</p>
              ) : (
                <p className="text-gray-400 text-center italic mt-8">选择标签并点击生成，查看 AI 的魔法...</p>
              )}
            </div>

            <button
              onClick={handleAiGenerate}
              disabled={isGenerating || selectedTags.length === 0}
              className={`
                w-full py-3 rounded-lg font-medium text-white shadow-md transition-all
                ${isGenerating || selectedTags.length === 0
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 hover:shadow-lg'}
              `}
            >
              {isGenerating ? '生成中...' : '生成评价'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};