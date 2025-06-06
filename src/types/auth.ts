export interface Provider {
  id: string;
  compactId: string; //used in the attestation package, one or two chars max
  name: string;
  icon: string;
}

export const providers: Provider[] = [
  { 
    id: 'google',
    compactId: 'g',
    name: 'Google',
    icon: 'https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg'
  },
  {
    id: 'github',
    compactId: 'gh',
    name: 'GitHub',
    icon: 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png'
  },
  {
    id: 'twitter',
    compactId: 't',
    name: 'Twitter',
    icon: 'https://abs.twimg.com/responsive-web/client-web/icon-ios.77d25eba.png'
  },
  {
    id: 'facebook',
    compactId: 'f',
    name: 'Facebook',
    icon: 'https://www.facebook.com/favicon.ico'
  },
  {
    id: 'microsoft',
    compactId: 'm',
    name: 'Microsoft',
    icon: 'https://www.microsoft.com/favicon.ico'
  },
  {
    id: 'apple',
    compactId: 'a',
    name: 'Apple',
    icon: 'https://www.apple.com/favicon.ico'
  },
  {
    id: 'linkedin',
    compactId: 'li',
    name: 'LinkedIn',
    icon: 'https://static.licdn.com/sc/h/akt4ae504epesldzj74dzred8'
  },
  {
    id: 'tiktok',
    compactId: 'tk',
    name: 'TikTok',
    icon: 'https://www.uplifterinc.com/public/uploads/800px-TikTok_Logo.svg.png'
  },
  {
    id: 'wechat',
    compactId: 'w',
    name: 'WeChat',
    icon: 'https://res.wx.qq.com/a/wx_fed/assets/res/NTI4MWU5.ico'
  },
  {
    id: 'alipay',
    compactId: 'ap',
    name: 'Alipay',
    icon: 'https://img.alicdn.com/tfs/TB1qEwuzrj1gK0jSZFOXXc7GpXa-32-32.ico'
  },
  {
    id: 'paypal',
    compactId: 'pp',
    name: 'PayPal',
    icon: 'https://www.paypalobjects.com/webstatic/icon/favicon.ico'
  },
  {
    id: 'line',
    compactId: 'l',
    name: 'LINE',
    icon: 'https://line.me/favicon.ico'
  }
];