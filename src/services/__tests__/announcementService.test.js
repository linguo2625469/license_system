const CloudService = require('../cloudService');
const { Announcement, Software } = require('../../models');
const sequelize = require('../../config/database');

describe('CloudService - Announcements', () => {
  let testSoftware;

  beforeAll(async () => {
    await sequelize.sync({ force: true });
    
    // 创建测试软件
    testSoftware = await Software.create({
      name: '测试软件',
      appKey: 'test-app-key-announcement',
      publicKey: 'test-public-key',
      privateKey: 'test-private-key',
      status: true
    });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('createAnnouncement', () => {
    it('应该成功创建软件特定公告', async () => {
      const announcementData = {
        softwareId: testSoftware.id,
        title: '测试公告',
        content: '这是一个测试公告',
        type: 'info',
        isPopup: true,
        showOnce: true,
        status: true
      };

      const announcement = await CloudService.createAnnouncement(announcementData);

      expect(announcement).toBeDefined();
      expect(announcement.title).toBe('测试公告');
      expect(announcement.softwareId).toBe(testSoftware.id);
      expect(announcement.type).toBe('info');
      expect(announcement.isPopup).toBe(true);
    });

    it('应该成功创建全局公告', async () => {
      const announcementData = {
        softwareId: null,
        title: '全局公告',
        content: '这是一个全局公告',
        type: 'warning'
      };

      const announcement = await CloudService.createAnnouncement(announcementData);

      expect(announcement).toBeDefined();
      expect(announcement.title).toBe('全局公告');
      expect(announcement.softwareId).toBeNull();
      expect(announcement.type).toBe('warning');
    });

    it('应该在软件不存在时抛出错误', async () => {
      const announcementData = {
        softwareId: 99999,
        title: '测试公告',
        type: 'info'
      };

      await expect(CloudService.createAnnouncement(announcementData))
        .rejects.toThrow('软件不存在');
    });

    it('应该在公告类型无效时抛出错误', async () => {
      const announcementData = {
        softwareId: testSoftware.id,
        title: '测试公告',
        type: 'invalid'
      };

      await expect(CloudService.createAnnouncement(announcementData))
        .rejects.toThrow('公告类型必须是 info、warning、error 或 success');
    });

    it('应该在时间范围无效时抛出错误', async () => {
      const announcementData = {
        softwareId: testSoftware.id,
        title: '测试公告',
        startTime: new Date('2024-12-31'),
        endTime: new Date('2024-01-01')
      };

      await expect(CloudService.createAnnouncement(announcementData))
        .rejects.toThrow('开始时间必须早于结束时间');
    });
  });

  describe('updateAnnouncement', () => {
    it('应该成功更新公告', async () => {
      const announcement = await Announcement.create({
        softwareId: testSoftware.id,
        title: '原标题',
        content: '原内容',
        type: 'info',
        status: true
      });

      const updated = await CloudService.updateAnnouncement(announcement.id, {
        title: '新标题',
        content: '新内容',
        type: 'warning'
      });

      expect(updated.title).toBe('新标题');
      expect(updated.content).toBe('新内容');
      expect(updated.type).toBe('warning');
    });

    it('应该在公告不存在时返回 null', async () => {
      const result = await CloudService.updateAnnouncement(99999, {
        title: '新标题'
      });

      expect(result).toBeNull();
    });
  });

  describe('deleteAnnouncement', () => {
    it('应该成功删除公告', async () => {
      const announcement = await Announcement.create({
        softwareId: testSoftware.id,
        title: '待删除公告',
        type: 'info',
        status: true
      });

      const deleted = await CloudService.deleteAnnouncement(announcement.id);

      expect(deleted).toBe(true);

      const found = await Announcement.findByPk(announcement.id);
      expect(found).toBeNull();
    });

    it('应该在公告不存在时返回 false', async () => {
      const result = await CloudService.deleteAnnouncement(99999);
      expect(result).toBe(false);
    });
  });

  describe('getAnnouncements', () => {
    let otherSoftware;

    beforeEach(async () => {
      await Announcement.destroy({ where: {} });
      
      // 创建另一个测试软件
      otherSoftware = await Software.create({
        name: '其他测试软件',
        appKey: 'test-app-key-other',
        publicKey: 'test-public-key',
        privateKey: 'test-private-key',
        status: true
      });
    });

    afterEach(async () => {
      if (otherSoftware) {
        await otherSoftware.destroy();
      }
    });

    it('应该返回有效期内的启用公告', async () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      // 创建有效公告
      await Announcement.create({
        softwareId: testSoftware.id,
        title: '有效公告',
        type: 'info',
        status: true,
        startTime: yesterday,
        endTime: tomorrow
      });

      // 创建已过期公告
      await Announcement.create({
        softwareId: testSoftware.id,
        title: '过期公告',
        type: 'info',
        status: true,
        startTime: new Date('2023-01-01'),
        endTime: new Date('2023-12-31')
      });

      // 创建禁用公告
      await Announcement.create({
        softwareId: testSoftware.id,
        title: '禁用公告',
        type: 'info',
        status: false,
        startTime: yesterday,
        endTime: tomorrow
      });

      const announcements = await CloudService.getAnnouncements(testSoftware.id);

      expect(announcements).toHaveLength(1);
      expect(announcements[0].title).toBe('有效公告');
    });

    it('应该返回软件特定公告和全局公告', async () => {
      // 创建软件特定公告
      await Announcement.create({
        softwareId: testSoftware.id,
        title: '软件公告',
        type: 'info',
        status: true
      });

      // 创建全局公告
      await Announcement.create({
        softwareId: null,
        title: '全局公告',
        type: 'info',
        status: true
      });

      // 创建其他软件的公告
      await Announcement.create({
        softwareId: otherSoftware.id,
        title: '其他软件公告',
        type: 'info',
        status: true
      });

      const announcements = await CloudService.getAnnouncements(testSoftware.id);

      expect(announcements).toHaveLength(2);
      expect(announcements.some(a => a.title === '软件公告')).toBe(true);
      expect(announcements.some(a => a.title === '全局公告')).toBe(true);
      expect(announcements.some(a => a.title === '其他软件公告')).toBe(false);
    });

    it('应该按排序顺序返回公告', async () => {
      await Announcement.create({
        softwareId: testSoftware.id,
        title: '公告1',
        type: 'info',
        status: true,
        sortOrder: 10
      });

      await Announcement.create({
        softwareId: testSoftware.id,
        title: '公告2',
        type: 'info',
        status: true,
        sortOrder: 20
      });

      await Announcement.create({
        softwareId: testSoftware.id,
        title: '公告3',
        type: 'info',
        status: true,
        sortOrder: 5
      });

      const announcements = await CloudService.getAnnouncements(testSoftware.id);

      expect(announcements).toHaveLength(3);
      expect(announcements[0].title).toBe('公告2'); // sortOrder 20
      expect(announcements[1].title).toBe('公告1'); // sortOrder 10
      expect(announcements[2].title).toBe('公告3'); // sortOrder 5
    });
  });

  describe('getAnnouncementList', () => {
    beforeEach(async () => {
      await Announcement.destroy({ where: {} });
    });

    it('应该返回分页的公告列表', async () => {
      // 创建多个公告
      for (let i = 1; i <= 5; i++) {
        await Announcement.create({
          softwareId: testSoftware.id,
          title: `公告${i}`,
          type: 'info',
          status: true
        });
      }

      const result = await CloudService.getAnnouncementList(testSoftware.id, {
        page: 1,
        limit: 3
      });

      expect(result.items).toHaveLength(3);
      expect(result.total).toBe(5);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(3);
    });

    it('应该支持状态筛选', async () => {
      await Announcement.create({
        softwareId: testSoftware.id,
        title: '启用公告',
        type: 'info',
        status: true
      });

      await Announcement.create({
        softwareId: testSoftware.id,
        title: '禁用公告',
        type: 'info',
        status: false
      });

      const result = await CloudService.getAnnouncementList(testSoftware.id, {
        status: true
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].title).toBe('启用公告');
    });

    it('应该支持类型筛选', async () => {
      await Announcement.create({
        softwareId: testSoftware.id,
        title: '信息公告',
        type: 'info',
        status: true
      });

      await Announcement.create({
        softwareId: testSoftware.id,
        title: '警告公告',
        type: 'warning',
        status: true
      });

      const result = await CloudService.getAnnouncementList(testSoftware.id, {
        type: 'warning'
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].title).toBe('警告公告');
    });
  });
});
