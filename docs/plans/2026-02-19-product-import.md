# 商品管理批量导入功能实现计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在商品管理页面增加导入Excel文件批量添加产品的功能

**Architecture:** 前端使用xlsx库解析Excel文件，后端提供批量创建产品API，支持同时创建产品和关联分类

**Tech Stack:** React, TypeScript, xlsx, Express, MySQL

---

### Task 1: 安装xlsx依赖

**Files:**
- Modify: `shangjiaduan/package.json`

**Step 1: 安装xlsx库**

```bash
cd shangjiaduan && npm install xlsx
```

**Step 2: 验证安装**

```bash
npm list xlsx
```

预期: 显示xlsx版本号

**Step 3: 提交**

```bash
git add shangjiaduan/package.json shangjiaduan/package-lock.json
git commit -m "feat: add xlsx library for Excel import"
```

---

### Task 2: 创建批量导入API

**Files:**
- Modify: `backend/src/routes/productItem.ts`
- Modify: `backend/src/models/ProductItemModel.ts`

**Step 1: 添加批量创建产品API**

在 `backend/src/routes/productItem.ts` 中添加:

```typescript
// 批量创建产品
router.post('/batch', authenticateMerchant, ProductItemController.batchCreate);
```

**Step 2: 实现批量创建控制器**

在 `backend/src/controllers/productItem.ts` 中添加:

```typescript
// 批量创建产品
static async batchCreate(req: AuthRequest, res: Response): Promise<void> {
  try {
    const merchantId = req.merchant!.id;
    const { products, categoryMap } = req.body;

    if (!Array.isArray(products) || products.length === 0) {
      res.status(400).json({ error: 'Products array is required' });
      return;
    }

    if (products.length > 100) {
      res.status(400).json({ error: 'Maximum 100 products per batch' });
      return;
    }

    // categoryMap: { "分类名称": categoryId }
    const results = [];
    for (const p of products) {
      const categoryName = p.categoryName || p.category;
      const categoryId = categoryMap?.[categoryName];

      if (!categoryId || !p.name) {
        results.push({ success: false, name: p.name, error: 'Missing category or name' });
        continue;
      }

      // 解析标签（逗号分隔）
      let tags: string[] = [];
      if (p.tags) {
        tags = p.tags.split(',').map((t: string) => t.trim()).filter(Boolean);
      }

      try {
        const product = await ProductItemModel.create({
          merchantId,
          categoryId,
          name: p.name,
          tags,
          isActive: p.isActive !== false
        });
        results.push({ success: true, name: p.name, id: product.id });
      } catch (e: any) {
        results.push({ success: false, name: p.name, error: e.message });
      }
    }

    res.json({ success: true, data: results });
  } catch (error: any) {
    console.error('Batch create products error:', error);
    res.status(500).json({ error: error.message || 'Failed to batch create products' });
  }
}
```

**Step 3: 测试批量创建API**

```bash
curl -X POST -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"products":[{"categoryId":1,"name":"测试产品1"},{"categoryId":1,"name":"测试产品2"}]}' \
  http://localhost:8080/api/merchant/products/batch
```

预期: 返回批量创建结果

**Step 4: 提交**

```bash
git add backend/src/routes/productItem.ts backend/src/controllers/productItem.ts
git commit -m "feat: add batch product creation API"
```

---

### Task 3: 创建导入组件

**Files:**
- Create: `shangjiaduan/components/ImportProductsModal.tsx`
- Modify: `shangjiaduan/pages/ProductManagement.tsx`

**Step 1: 创建ImportProductsModal组件**

Excel表头需包含:
- 产品名称 (必填)
- 分类 (必填，匹配数据库中的分类名称)
- 标签 (可选，多个标签用逗号分隔)
- 是否启用 (可选，默认启用)
import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { X, Upload, FileText, Check, AlertCircle } from 'lucide-react';
import api from '../services/api';

interface ImportProductsModalProps {
  categories: { id: number; name: string }[];
  onClose: () => void;
  onImportSuccess: () => void;
}

interface ImportResult {
  name: string;
  success: boolean;
  error?: string;
  id?: number;
}

export const ImportProductsModal: React.FC<ImportProductsModalProps> = ({
  categories,
  onClose,
  onImportSuccess
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const [results, setResults] = useState<ImportResult[]>([]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

        // 第一行是表头，从第二行开始是数据
        const headers = jsonData[0] as string[];
        const products = jsonData.slice(1).map((row: any) => {
          const obj: any = {};
          headers.forEach((h, i) => {
            obj[h] = row[i];
          });
          return obj;
        }).filter((p: any) => p.name || p.产品名称);

        setPreviewData(products);
      } catch (error) {
        alert('解析Excel文件失败');
      }
    };
    reader.readAsArrayBuffer(selectedFile);
  };

  const handleImport = async () => {
    if (previewData.length === 0) return;

    setImporting(true);
    try {
      // 构建分类名称到ID的映射
      const categoryMap: Record<string, number> = {};
      categories.forEach(c => {
        categoryMap[c.name] = c.id;
      });

      const products = previewData.map(row => ({
        name: row.name || row.产品名称 || row.Name,
        categoryName: row.category || row.分类 || row.categoryName,
        tags: row.tags || row.标签 || row.Tag || '',
        isActive: row.isActive !== '否' && row.是否启用 !== '否'
      }));

      const response = await api.post('/merchant/products/batch', { products, categoryMap });
      setResults(response.data.data);

      if (response.data.data.filter((r: ImportResult) => r.success).length > 0) {
        onImportSuccess();
      }
    } catch (error: any) {
      alert(error.response?.data?.error || '导入失败');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">批量导入产品</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
        </div>

        {!file ? (
          <div className="border-2 border-dashed rounded-lg p-8 text-center">
            <Upload size={48} className="mx-auto mb-4 text-gray-400" />
            <p className="text-gray-500 mb-4">点击选择Excel文件</p>
            <p className="text-sm text-gray-400 mb-4">Excel表头需包含: 产品名称, 分类(分类名称), 标签(逗号分隔)</p>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              className="hidden"
              id="file-input"
            />
            <label
              htmlFor="file-input"
              className="px-4 py-2 bg-blue-500 text-white rounded-lg cursor-pointer hover:bg-blue-600"
            >
              选择文件
            </label>
          </div>
        ) : previewData.length > 0 && results.length === 0 ? (
          <div>
            <div className="mb-4 flex items-center gap-2">
              <FileText size={20} className="text-green-500" />
              <span className="font-medium">{file.name}</span>
              <span className="text-gray-500">({previewData.length} 条数据)</span>
            </div>

            <div className="mb-4 max-h-60 overflow-y-auto border rounded">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">产品名称</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">分类</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">标签</th>
                  </tr>
                </thead>
                <tbody>
                  {previewData.slice(0, 10).map((row, i) => (
                    <tr key={i} className="border-t">
                      <td className="px-3 py-2">{row.name || row.产品名称 || '-'}</td>
                      <td className="px-3 py-2">{row.category || row.分类 || '-'}</td>
                      <td className="px-3 py-2">{row.tags || row.标签 || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {previewData.length > 10 && (
                <p className="text-center py-2 text-gray-500 text-sm">
                  ...还有 {previewData.length - 10} 条数据
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setFile(null); setPreviewData([]); }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                重新选择
              </button>
              <button
                onClick={handleImport}
                disabled={importing}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300"
              >
                {importing ? '导入中...' : `导入 ${previewData.length} 条数据`}
              </button>
            </div>
          </div>
        ) : results.length > 0 ? (
          <div>
            <h3 className="font-medium mb-3">导入结果</h3>
            <div className="max-h-60 overflow-y-auto border rounded">
              {results.map((r, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-2 border-b">
                  {r.success ? (
                    <Check size={16} className="text-green-500" />
                  ) : (
                    <AlertCircle size={16} className="text-red-500" />
                  )}
                  <span className="flex-1">{r.name}</span>
                  {r.success ? (
                    <span className="text-green-500 text-sm">成功</span>
                  ) : (
                    <span className="text-red-500 text-sm">{r.error}</span>
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={onClose}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
            >
              完成
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
};
```

**Step 2: 在ProductManagement中添加导入按钮和弹窗**

在 `shangjiaduan/pages/ProductManagement.tsx` 中:

1. 导入组件:
```tsx
import { ImportProductsModal } from '../components/ImportProductsModal';
```

2. 添加状态:
```tsx
const [importModalOpen, setImportModalOpen] = useState(false);
```

3. 在"添加产品"按钮旁边添加导入按钮:
```tsx
<button
  onClick={() => setImportModalOpen(true)}
  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 mt-6"
>
  <Upload size={20} className="inline mr-2" />
  导入
</button>
```

4. 在页面底部添加弹窗:
```tsx
{importModalOpen && (
  <ImportProductsModal
    categories={flatCategories}
    onClose={() => setImportModalOpen(false)}
    onImportSuccess={() => {
      setImportModalOpen(false);
      fetchProducts();
    }}
  />
)}
```

**Step 3: 验证构建**

```bash
cd shangjiaduan && npm run build
```

预期: 构建成功

**Step 4: 提交**

```bash
git add shangjiaduan/components/ImportProductsModal.tsx shangjiaduan/pages/ProductManagement.tsx
git commit -m "feat: add Excel import for batch product creation"
```

---

## 测试检查清单

- [ ] 能选择并解析xlsx文件
- [ ] 预览显示正确的数据
- [ ] 批量导入成功创建产品
- [ ] 导入结果显示成功/失败
- [ ] 导入100条以上产品时显示限制错误

---

## 执行选项

**Plan complete and saved to `docs/plans/2026-02-19-product-import.md`. Two execution options:**

**1. Subagent-Driven (this session)** - I dispatch fresh subagent per task, review between tasks, fast iteration

**2. Parallel Session (separate)** - Open new session with executing-plans, batch execution with checkpoints

**Which approach?**
