import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createChatId } from '../utils/chat_id';

interface ThreadState {
  chat_id: string | null;
  domain: string | null;
  userchar_id: string | null;
  
  // Actions
  set_chat_id: (chat_id: string) => void;
  ensure_chat_id: (domain: string, userchar_id: string) => string;
  clear_thread: () => void;
}

export const useThreadStore = create<ThreadState>()(
  persist(
    (set, get) => ({
      chat_id: null,
      domain: null,
      userchar_id: null,
      
      set_chat_id: (chat_id: string) => {
        set({ chat_id });
      },
      
      ensure_chat_id: (domain: string, userchar_id: string) => {
        const { chat_id, domain: currentDomain, userchar_id: currentUsercharId } = get();
        
        // If we have a chat_id for the same domain/userchar, reuse it
        if (chat_id && currentDomain === domain && currentUsercharId === userchar_id) {
          return chat_id;
        }
        
        // Generate new chat_id for new thread
        const newChatId = createChatId(domain, userchar_id);
        set({ 
          chat_id: newChatId, 
          domain, 
          userchar_id 
        });
        
        return newChatId;
      },
      
      clear_thread: () => {
        set({ 
          chat_id: null, 
          domain: null, 
          userchar_id: null 
        });
      }
    }),
    {
      name: 'blankwars-thread-storage',
      // Only persist the essential thread data
      partialize: (state) => ({
        chat_id: state.chat_id,
        domain: state.domain,
        userchar_id: state.userchar_id
      })
    }
  )
);