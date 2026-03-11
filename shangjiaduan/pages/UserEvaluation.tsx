import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { User, Evaluation, Tag } from '../types';
import { Search, Eye, Star, Sparkles, X, Trash2, Users, MessageSquare } from 'lucide-react';

export const UserEvaluation: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'users' | 'evaluations'>('users');

  // 用户相关状态
  const [users, setUsers] = useState<User[]>([]);
  const [userSearch, setUserSearch] = useState('');

  // 评价相关状态
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [aiGeneratedText, setAiGeneratedText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    fetchUsers();
    fetchEvaluations();
  }, [userSearch]);

  // 获取用户列表
  const fetchUsers = async () => {
    try {
      const res = await api.get('/users', { params: { nickname: userSearch } });
      setUsers(res.data?.data || []);
    } catch {
      // Mock data
      setUsers([
        { id: 1, nickname: 'Alice', is_active: true, created_at: '2023-01-01' },
        { id: 2, nickname: 'Bob', is_active: false, created_at: '2023-01-02' },
        { id: 3, nickname: 'Charlie', is_active: true, created_at: '2023-01-03' },
      ]);
    }
  };

  // 获取评价列表
  const fetchEvaluations = async () => {
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
        },
        {
          id: 2,
          user_id: 2,
          user_nickname: 'Bob',
          content: '环境不错，价格实惠',
          rating: 4,
          tags: [{ id: 2, name: '新鲜' }, { id: 3, name: '实惠' }],
          created_at: '2023-10-26'
        }
      ]);
      setTags([{ id: 1, name: '美味' }, { id: 2, name: '新鲜' }, { id: 3, name: '微辣' }, { id: 4, name: '实惠' }]);
    }
  };

  // 切换用户状态
  const toggleUserStatus = async (user: User) => {
    try {
      await api.put(`/users/${user.id}/status`, { is_active: !user.is_active });
      fetchUsers();
    } catch {
      alert('状态更新失败');
    }
  };

  // 删除评价
  const deleteEvaluation = async (id: number) => {
    if (!confirm('确定删除这条评价吗？')) return;
    try {
      await api.delete(`/reviews/${id}`);
      fetchEvaluations();
    } catch {
      alert('删除失败');
    }
  };

  // AI生成评价
  const handleAiGenerate = async () => {
    if (selectedTags.length === 0) return;
    setIsGenerating(true);
    try {
      const res = await api.post('/reviews/generate', { tags: selectedTags });
      setAiGeneratedText(res.data?.data?.text || '生成的文本将显示在这里。');
    } catch {
      setTimeout(() => {
        setAiGeneratedText(`基于标签 ${selectedTags.join(', ')}，这个地方绝对棒极了！味道正宗，服务一流。强烈推荐！`);
      }, 1000);
    } finally {
      setIsGenerating(false);
    }
  };

  // 切换标签
  const toggleTag = (tagName: string) => {
    if (selectedTags.includes(tagName)) {
      setSelectedTags(selectedTags.filter(t => t !== tagName));
    } else {
      setSelectedTags([...selectedTags, tagName]);
    }
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">用户与评价</h1>
      </div>

      {/* 标签切换 */}
      <div className="flex border-b border-gray-200">
        <button
          className={`px-6 py-3 font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'users'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('users')}
        >
          <Users className="w-5 h-5" />
          用户管理
          <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">{users.length}</span>
        </button>
        <button
          className={`px-6 py-3 font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'evaluations'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('evaluations')}
        >
          <MessageSquare className="w-5 h-5" />
          评价管理
          <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">{evaluations.length}</span>
        </button>
      </div>

      {/* 用户管理面板 */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {/* 搜索栏 */}
          <div className="flex justify-between items-center">
            <div className="relative">
              <Search size={18} className="absolute left-3 top-2.5 text-gray-400" />
              <input
                type="text"
                placeholder="搜索昵称..."
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <span className="text-sm text-gray-500">共 {users.length} 位用户</span>
          </div>

          {/* 用户列表 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">用户</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">加入时间</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">评价数</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => {
                  const userEvals = evaluations.filter(e => e.user_id === user.id);
                  return (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold mr-3">
                            {user.nickname[0]}
                          </div>
                          <div className="text-sm font-medium text-gray-900">{user.nickname}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {user.is_active ? '正常' : '已禁用'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.created_at}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-medium">
                          {userEvals.length} 条
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => toggleUserStatus(user)}
                          className="text-blue-600 hover:text-blue-900 mr-4"
                        >
                          {user.is_active ? '禁用' : '启用'}
                        </button>
                        <button className="text-gray-400 hover:text-gray-600">
                          <Eye size={18} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {users.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                暂无用户数据
              </div>
            )}
          </div>
        </div>
      )}

      {/* 评价管理面板 */}
      {activeTab === 'evaluations' && (
        <div className="space-y-4">
          {/* 操作栏 */}
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-500">共 {evaluations.length} 条评价</span>
            <button
              onClick={() => setIsAiModalOpen(true)}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center shadow-lg shadow-purple-200 transition-all"
            >
              <Sparkles size={18} className="mr-2" />
              AI 生成示例
            </button>
          </div>

          {/* 评价列表 */}
          <div className="grid gap-4">
            {evaluations.map((ev) => (
              <div key={ev.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-start mb-3">
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
                  <button
                    onClick={() => deleteEvaluation(ev.id)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
                <p className="text-gray-700 mb-3">{ev.content}</p>
                <div className="flex flex-wrap gap-2">
                  {ev.tags.map(t => (
                    <span key={t.id} className="px-2 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-medium">
                      #{t.name}
                    </span>
                  ))}
                </div>
              </div>
            ))}
            {evaluations.length === 0 && (
              <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 text-center text-gray-500">
                暂无评价数据
              </div>
            )}
          </div>
        </div>
      )}

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
