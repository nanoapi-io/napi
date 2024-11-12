export type Comic = {
    id: number
    name: string
    author: string
    userId: number
    createdAt: Date
    updatedAt: Date
}

export type ComicPartial = {
    name: string
    author: string
    userId: number
}

let newId = 0
const comics = []

export function create(comic: ComicPartial): Comic {
    const createdAt = new Date()
    const updatedAt = new Date()
    const newComic = { ...comic, id: newId, createdAt, updatedAt }
    comics.push(comic)
    newId += 1
    return newComic
}

export function getAll(): Comic[] {
    return comics
}

export function getByUserId(userId: number): Comic[] {
    return comics.filter(collection => collection.userId === userId)
}

export function update(id: number, collection: ComicPartial): Comic {
    const index = comics.findIndex(c => c.id === id)
    if (index === -1) {
        throw new Error('Collection not found')
    }
    comics[index] = { ...comics[index], updatedAt: new Date() }
    return collection[index]
}

export function deleteComic(id: number) {
    const index = comics.findIndex(c => c.id === id)
    if (index === -1) {
        throw new Error('Collection not found')
    }
    comics.splice(index, 1)[0]
}

export function getRandomComic(): Comic {
    const randomIndex = Math.floor(Math.random() * comics.length)
    return comics[randomIndex]
}