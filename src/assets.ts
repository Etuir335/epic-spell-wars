// Все пути к файлам из public строим через BASE_URL (сайт живёт в /epic-spell-wars/ на GitHub Pages).
export const assetUrl = (path: string) => import.meta.env.BASE_URL + path
export const cardUrl = (deck: string, index: number, back = false) => assetUrl(`assets/cards/${deck}/${index}${back ? '_back' : ''}.webp`)
