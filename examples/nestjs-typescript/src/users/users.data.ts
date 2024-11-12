export type User = {
    id: number
    name: string
    createdAt: Date
    updatedAt: Date
}

export type UserPartial = {
    name: string
}

let newId = 0
const users = []

export function create(collection: UserPartial): User {
    const createdAt = new Date()
    const updatedAt = new Date()
    const newCollection = { ...collection, id: newId, createdAt, updatedAt }
    users.push(newCollection)
    newId += 1
    return newCollection
}

export function getAll(): User[] {
    return users
}

export function getById(id: number): User | null {
    return users.find(user => user.id === id)
}

export function update(id: number, collection: UserPartial): User {
    const index = users.findIndex(c => c.id === id)
    if (index === -1) {
        throw new Error('Collection not found')
    }
    users[index] = { ...users[index], updatedAt: new Date() }
    return collection[index]
}

export function deleteUser(id: number) {
    const index = users.findIndex(c => c.id === id)
    if (index === -1) {
        throw new Error('Collection not found')
    }
    users.splice(index, 1)[0]
}

export function getRandomUser(): User {
    const randomIndex = Math.floor(Math.random() * users.length)
    return users[randomIndex]
}