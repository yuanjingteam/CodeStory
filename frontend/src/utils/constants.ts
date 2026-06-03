export const userSexMap: Record<number, string> = {
  0: '未设置性别',
  1: '男',
  2: '女',
};

export const userRoleMap: Record<number, { text: string; color: string }> = {
  0: { text: '普通用户', color: 'bg-green-400 text-white' },
  1: { text: '管理员', color: 'bg-red-400 text-white' },
};

export const userLevelMap: Record<
  number,
  {
    text: string;
    color: string;
    starColor: string;
  }
> = {
  0: {
    text: '倔强青铜',
    color: 'bg-gray-700 text-white border-gray-500',
    starColor: 'text-yellow-400',
  },
  1: {
    text: '秩序白银',
    color: 'bg-slate-400 text-white border-slate-300',
    starColor: 'text-gray-600',
  },
  2: {
    text: '荣耀黄金',
    color: 'bg-yellow-400 text-black border-yellow-300',
    starColor: 'text-amber-600',
  },
  3: {
    text: '傲慢铂金',
    color: 'bg-cyan-300 text-black border-cyan-400',
    starColor: 'text-blue-600',
  },
  4: {
    text: '疯狂钻石',
    color: 'bg-purple-400 text-white border-purple-400',
    starColor: 'text-pink-300',
  },
  5: {
    text: '璀璨欧泊',
    color:
      'bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-400 text-white border-pink-400',
    starColor: 'text-yellow-300',
  },
  6: {
    text: '至高托帕',
    color: 'bg-gradient-to-r from-blue-400 via-cyan-300 to-teal-400 text-white border-blue-400',
    starColor: 'text-orange-300',
  },
  7: {
    text: '皇家蓝宝',
    color: 'bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 text-white border-blue-500',
    starColor: 'text-orange-400',
  },
  8: {
    text: '龙血红宝',
    color:
      'bg-gradient-to-r from-red-600 via-red-500 to-pink-500 text-white border-red-500',
    starColor: 'text-yellow-400',
    
  },
  9: {
    text: '帝王翡翠',
    color:
      'bg-gradient-to-r from-green-600 via-emerald-500 to-teal-400 text-white border-green-600',
    starColor: 'text-red-300',
  },
};

export const courseLevelMap: Record<number, { text: string; color: string }> = {
  0: { text: '入门', color: 'bg-green-500  text-white' },
  1: { text: '初级', color: 'bg-blue-500 text-white' },
  2: { text: '中级', color: 'bg-yellow-500 text-white' },
  3: { text: '高级', color: 'bg-red-500 text-white' },
};

export const courseStatusMap: Record<number, { text: string; color: string }> =
  {
    0: { text: '未开始', color: 'bg-gray-700 text-white' },
    1: { text: '学习中', color: 'bg-yellow-500 text-white' },
    2: { text: '已完成', color: 'bg-green-500 text-white' },
  };
