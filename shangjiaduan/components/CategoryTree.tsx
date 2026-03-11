import React, { useState } from 'react';
import { ChevronRight, ChevronDown, Folder, FolderOpen, Plus, Edit, Trash2 } from 'lucide-react';

interface Category {
  id: number;
  name: string;
  parentId: number | null;
  level: number;
  children?: Category[];
}

interface CategoryTreeProps {
  categories: Category[];
  onSelect?: (category: Category) => void;
  onAdd?: (parentId?: number) => void;
  onEdit?: (category: Category) => void;
  onDelete?: (category: Category) => void;
}

export const CategoryTree: React.FC<CategoryTreeProps> = ({
  categories,
  onSelect,
  onAdd,
  onEdit,
  onDelete
}) => {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const toggleExpand = (id: number) => {
    const newExpanded = new Set(expanded);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpanded(newExpanded);
  };

  const renderCategory = (category: Category, level: number = 0) => {
    const isExpanded = expanded.has(category.id);
    const hasChildren = category.children && category.children.length > 0;

    return (
      <div key={category.id} style={{ marginLeft: `${level * 20}px` }}>
        <div
          className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded cursor-pointer"
          onClick={() => onSelect?.(category)}
        >
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(category.id);
              }}
              className="p-1 hover:bg-gray-200 rounded"
            >
              {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
          ) : (
            <div style={{ width: '24px' }} />
          )}

          {isExpanded ? <FolderOpen size={18} className="text-yellow-500" /> : <Folder size={18} className="text-yellow-500" />}

          <span className="flex-1">{category.name}</span>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onAdd?.(category.id);
            }}
            className="p-1 hover:bg-gray-200 rounded"
            title="添加子分类"
          >
            <Plus size={16} />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit?.(category);
            }}
            className="p-1 hover:bg-gray-200 rounded"
            title="编辑"
          >
            <Edit size={16} />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete?.(category);
            }}
            className="p-1 hover:bg-red-100 text-red-500 rounded"
            title="删除"
          >
            <Trash2 size={16} />
          </button>
        </div>

        {isExpanded && hasChildren && (
          <div>
            {category.children!.map(child => renderCategory(child, level + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="border rounded-lg p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">分类管理</h2>
        <button
          onClick={() => onAdd?.()}
          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          添加根分类
        </button>
      </div>

      {categories.length === 0 ? (
        <p className="text-gray-500 text-center py-8">暂无分类，请添加根分类</p>
      ) : (
        <div>{categories.map(category => renderCategory(category))}</div>
      )}
    </div>
  );
};
