import { ref } from 'vue'

export const LANGUAGES = [
    { code: 'en',    name: 'English',       label: 'English' },
    { code: 'zh-CN', name: '中文',           label: 'Chinese' },
    { code: 'ms',    name: 'Bahasa Melayu', label: 'Malay' },
    { code: 'ta',    name: 'தமிழ்',          label: 'Tamil' },
]

function savedLanguage() {
    try { return localStorage.getItem('mg-language') || 'en' } catch { return 'en' }
}

export const language = ref(savedLanguage())

// Your own wording. Any word not listed here is left to Google.
const WORDS = {
    'zh-CN': {
        Spirits: '精灵',
        Auto: '自动',
        Map: '地图',
        Journey: '旅程',
        Me: '我',
    },
    ms: {},
    ta: {},
}

export const word = (en) => WORDS[language.value]?.[en] ?? en
export const hasWord = (en) => !!WORDS[language.value]?.[en]