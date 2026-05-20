export const userSexMap: Record<number, string> = {
  0: '未设置性别',
  1: '男',
  2: '女',
};

export const userRoleMap: Record<number, { text: string; color: string }> = {
  0: { text: '普通用户', color: 'bg-green-400 text-white' },
  1: { text: '管理员', color: 'bg-red-400 text-white' },
};

export const userLevelMap: Record<number, { text: string; color: string }> = {
  0: { text: '倔强青铜', color: 'bg-gray-700 text-white' },
  1: { text: '秩序白银', color: 'bg-slate-400 text-white' },
  2: { text: '荣耀黄金', color: 'bg-yellow-400 text-black' },
  3: { text: '傲慢铂金', color: 'bg-cyan-300 text-black' },
  4: { text: '疯狂钻石', color: 'bg-purple-400 text-white' },
  5: {
    text: '璀璨欧泊',
    color:
      'bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-400 text-white',
  },
};

export const courseLevelMap: Record<number, { text: string; color: string }> = {
  0: { text: '入门', color: 'bg-green-500  text-white' },
  1: { text: '初级', color: 'bg-blue-500 text-white' },
  2: { text: '中级', color: 'bg-yellow-500 text-white' },
  3: { text: '高级', color: 'bg-red-500 text-white' },
};
 
export const courseStatusMap: Record<number, { text: string; color: string }> = {
  0: { text: '未开始', color: 'bg-gray-700 text-white' },
  1: { text: '学习中', color: 'bg-yellow-500 text-white' },
  2: { text: '已完成', color: 'bg-green-500 text-white' },
};