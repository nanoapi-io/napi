export type Collection = {
    id: number
    name: string
    comicId: number
    userId: number
    createdAt: Date
    updatedAt: Date
}

export type CollectionPartial = {
    name: string
    comicId: number
    userId: number
}

let newId = 0
const collections = []

export function create(collection: CollectionPartial): Collection {
    const createdAt = new Date()
    const updatedAt = new Date()
    const newCollection = { ...collection, id: newId, createdAt, updatedAt }
    collections.push(newCollection)
    newId += 1
    return newCollection
}

export function getAll(): Collection[] {
    return collections
}

export function getByUserId(userId: number): Collection[] {
    return collections.filter(collection => collection.userId === userId)
}

export function update(id: number, collection: CollectionPartial): Collection {
    const index = collections.findIndex(c => c.id === id)
    if (index === -1) {
        throw new Error('Collection not found')
    }
    collections[index] = { ...collections[index], updatedAt: new Date() }
    return collection[index]
}

export function deleteCollection(id: number) {
    const index = collections.findIndex(c => c.id === id)
    if (index === -1) {
        throw new Error('Collection not found')
    }
    collections.splice(index, 1)[0]
}

export function getRandomCollection(): Collection {
    const randomIndex = Math.floor(Math.random() * collections.length)
    return collections[randomIndex]
}

const def = [1]

export default def