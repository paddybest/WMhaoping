import { TagService } from '../../src/services/TagService';
import { pool } from '../../src/database/connection';

describe('TagService', () => {
  describe('getTagsByCategory', () => {
    it('should return tags grouped by category', async () => {
      // Mock pool.execute for this test
      (pool.execute as jest.Mock).mockImplementation(async (query: string, params: any[]) => {
        // Mock responses for getTagsByCategory queries
        if (query.includes('SELECT pc.id, pc.name, COUNT')) {
          // Return categories query
          return [[
            { id: 1, name: '电子产品', tag_count: 2 },
            { id: 2, name: '服装', tag_count: 1 }
          ], []];
        }

        if (query.includes('SELECT id, name, order_index FROM product_categories WHERE parent_id')) {
          // Return tags for a specific category
          const categoryId = params[0];
          if (categoryId === 1) {
            return [[
              { id: 10, name: '手机', order_index: 1 },
              { id: 11, name: '电脑', order_index: 2 }
            ], []];
          } else if (categoryId === 2) {
            return [[
              { id: 20, name: '上衣', order_index: 1 }
            ], []];
          }
          return [[], []];
        }

        // Default empty response
        return [[], []];
      });

      const merchantId = 1;
      const result = await TagService.getTagsByCategory(merchantId);

      expect(Array.isArray(result)).toBe(true);
      if (result.length > 0) {
        expect(result[0]).toHaveProperty('id');
        expect(result[0]).toHaveProperty('name');
        expect(result[0]).toHaveProperty('tags');
        expect(Array.isArray(result[0].tags)).toBe(true);
      }
    });
  });

  describe('createTag', () => {
    let mockConnection: any;

    beforeEach(() => {
      // Create mock connection object
      mockConnection = {
        beginTransaction: jest.fn().mockResolvedValue(undefined),
        execute: jest.fn().mockResolvedValue([[], []]),
        commit: jest.fn().mockResolvedValue(undefined),
        rollback: jest.fn().mockResolvedValue(undefined),
        release: jest.fn().mockResolvedValue(undefined)
      };

      // Mock pool.getConnection to return mock connection
      (pool.getConnection as jest.Mock).mockResolvedValue(mockConnection);
    });

    afterEach(() => {
      jest.clearAllMocks();
    });

    it('should create tag under category', async () => {
      // Mock execute to return appropriate responses
      mockConnection.execute
        .mockResolvedValueOnce([[{ id: 1 }], []]) // Category exists
        .mockResolvedValueOnce([[{ count: 0 }], []]) // Tag count check
        .mockResolvedValueOnce([[], []]) // Name uniqueness check
        .mockResolvedValueOnce([[{ level: 0, path: '/1/' }], []]) // Parent info
        .mockResolvedValueOnce([{ insertId: 10 }, []]) // Insert tag
        .mockResolvedValueOnce([[], []]); // Update path

      // Mock pool.execute for getTagById
      (pool.execute as jest.Mock).mockResolvedValueOnce([[
        {
          id: 10,
          name: '测试标签',
          merchantId: 1,
          category_id: 1
        }
      ], []]);

      const result = await TagService.createTag(1, 1, '测试标签');

      expect(result).toHaveProperty('id');
      expect(result.name).toBe('测试标签');
      expect(result.category_id).toBe(1);
      expect(mockConnection.beginTransaction).toHaveBeenCalled();
      expect(mockConnection.commit).toHaveBeenCalled();
      expect(mockConnection.release).toHaveBeenCalled();
    });

    it('should throw error if category has 6 tags', async () => {
      // Mock execute to return category with 6 tags
      mockConnection.execute
        .mockResolvedValueOnce([[{ id: 999 }], []]) // Category exists
        .mockResolvedValueOnce([[{ count: 6 }], []]); // Tag count is 6

      await expect(
        TagService.createTag(1, 999, '标签')
      ).rejects.toThrow('Category already has 6 tags');

      expect(mockConnection.beginTransaction).toHaveBeenCalled();
      expect(mockConnection.rollback).toHaveBeenCalled();
      expect(mockConnection.release).toHaveBeenCalled();
    });

    it('should throw error if category not found', async () => {
      // Mock execute to return empty category
      mockConnection.execute.mockResolvedValueOnce([[], []]);

      await expect(
        TagService.createTag(1, 999, '标签')
      ).rejects.toThrow('Category not found');
    });

    it('should throw error if tag name already exists in category', async () => {
      mockConnection.execute
        .mockResolvedValueOnce([[{ id: 1 }], []]) // Category exists
        .mockResolvedValueOnce([[{ count: 0 }], []]) // Tag count check
        .mockResolvedValueOnce([[{ id: 5 }], []]); // Tag name exists

      await expect(
        TagService.createTag(1, 1, '现有标签')
      ).rejects.toThrow('Tag with this name already exists in this category');
    });
  });
});
