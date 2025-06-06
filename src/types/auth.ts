export interface Provider {
  id: string;
  name: string;
  icon: string;
}

export const providers: Provider[] = [
  { 
    id: 'google',
    name: 'Google',
    icon: 'https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg'
  },
  {
    id: 'github',
    name: 'GitHub',
    icon: 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png'
  },
  {
    id: 'twitter',
    name: 'Twitter',
    icon: 'https://abs.twimg.com/responsive-web/client-web/icon-ios.77d25eba.png'
  },
  {
    id: 'facebook',
    name: 'Facebook',
    icon: 'https://www.facebook.com/favicon.ico'
  },
  {
    id: 'microsoft',
    name: 'Microsoft',
    icon: 'https://www.microsoft.com/favicon.ico'
  },
  {
    id: 'apple',
    name: 'Apple',
    icon: 'https://www.apple.com/favicon.ico'
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    icon: 'https://static.licdn.com/sc/h/akt4ae504epesldzj74dzred8'
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    icon: 'https://www.uplifterinc.com/public/uploads/800px-TikTok_Logo.svg.png'
  },
  {
    id: 'wechat',
    name: 'WeChat',
    icon: 'https://res.wx.qq.com/a/wx_fed/assets/res/NTI4MWU5.ico'
  },
  {
    id: 'alipay',
    name: 'Alipay',
    icon: 'https://img.alicdn.com/tfs/TB1qEwuzrj1gK0jSZFOXXc7GpXa-32-32.ico'
  },
  {
    id: 'paypal',
    name: 'PayPal',
    icon: 'https://www.paypalobjects.com/webstatic/icon/favicon.ico'
  },
  {
    id: 'line',
    name: 'LINE',
    icon: 'https://line.me/favicon.ico'
  }
];