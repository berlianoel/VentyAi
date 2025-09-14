let currentConversationId: string | null = null

export const setConversationId = (id: string | null) => {
  currentConversationId = id
}

export const getConversationId = () => {
  return currentConversationId
}

export const clearConversationId = () => {
  currentConversationId = null
}
