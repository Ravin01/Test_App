import { create } from 'zustand';
import { shallow } from 'zustand/shallow';
import api from '../Utils/Api';

// Show interface based on Dashboard usage
interface Show {
  _id: string;
  title: string;
  isLive: boolean;
  scheduledAt?: string;
  thumbnailImage?: string;
  sellerUserName?: string;
  sellerProfileURL?: string;
  viewerCount?: number;
  liveStreamId?: string;
  streamStatus?: string;
  registrationCount?: number;
  isRegistered?: boolean;
  sellerId?: string;
  hostId?: string;
  [key: string]: any; // For other properties
}

interface ShowsState {
  // State
  shows: Show[];
  page: number;
  hasMore: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  fetchShows: (resetPage?: boolean) => Promise<void>;
  loadMore: () => Promise<void>;
  refreshToCurrentPage: () => Promise<void>;
  reset: () => void;
  updateShow: (showId: string, updates: Partial<Show>) => void;
  updateShows: (shows: Show[]) => void;
  
  // Computed selectors (getters)
  getLiveShows: () => Show[];
  getUpcomingShows: () => Show[];
}

const ITEMS_PER_PAGE = 20;

export const useShowsStore = create<ShowsState>((set, get) => ({
  // Initial state
  shows: [],
  page: 0,
  hasMore: true,
  isLoading: false,
  error: null,

  // Fetch shows with pagination
  fetchShows: async (resetPage = false) => {
    const { isLoading, page, shows } = get();
    
    // Prevent duplicate requests
    if (isLoading) return;

    const currentPage = resetPage ? 1 : page;
    
    set({ isLoading: true, error: null });

    try {
      const response = await api.get('/search/shows', {
        params: {
          page: currentPage,
          limit: ITEMS_PER_PAGE,
        },
      });

      const fetchedShows: Show[] = response.data?.data || [];
      
      // Sort shows: live first, then by scheduled time
      const sortedShows = fetchedShows
        .sort((a, b) => new Date(a.scheduledAt || 0).getTime() - new Date(b.scheduledAt || 0).getTime())
        .sort((a, b) => (b.isLive === a.isLive ? 0 : b.isLive ? 1 : -1));

      set({
        shows: resetPage ? sortedShows : [...shows, ...sortedShows],
        page: currentPage,
        hasMore: fetchedShows.length === ITEMS_PER_PAGE,
        isLoading: false,
      });

      console.log(`✅ [ShowsStore] Fetched ${fetchedShows.length} shows (page ${currentPage})`);
    } catch (error: any) {
      console.error('❌ [ShowsStore] Error fetching shows:', error);
      set({
        error: error.message || 'Failed to fetch shows',
        isLoading: false,
      });
    }
  },

  // Load more shows (increment page)
  loadMore: async () => {
    const { hasMore, isLoading, page } = get();
    
    if (!hasMore || isLoading) return;

    set({ page: page + 1 });
    await get().fetchShows(false);
  },

  // Refresh to current page - fetches all pages from 1 to current page
  refreshToCurrentPage: async () => {
    const { isLoading, page: currentPage } = get();
    
    console.log('🔄 [ShowsStore] refreshToCurrentPage called, current page:', currentPage);
    
    // Prevent duplicate requests
    if (isLoading) {
      console.log('⚠️ [ShowsStore] Already loading, skipping refresh');
      return;
    }

    // If on page 0 or 1, just do a regular reset fetch
    if (currentPage <= 1) {
      console.log('📍 [ShowsStore] On first page, doing regular fetch');
      await get().fetchShows(true);
      return;
    }

    set({ isLoading: true, error: null });
    console.log('🔄 [ShowsStore] Fetching pages 1 to', currentPage);

    try {
      // Fetch all pages from 1 to current page in parallel
      const pagePromises = [];
      for (let pageNum = 1; pageNum <= currentPage; pageNum++) {
        pagePromises.push(
          api.get('/search/shows', {
            params: {
              page: pageNum,
              limit: ITEMS_PER_PAGE,
            },
          })
        );
      }

      const responses = await Promise.all(pagePromises);
      
      // Combine all fetched shows
      const allFetchedShows: Show[] = [];
      responses.forEach((response, index) => {
        const pageShows = response.data?.data || [];
        console.log(`📄 [ShowsStore] Page ${index + 1}:`, pageShows.length, 'shows');
        allFetchedShows.push(...pageShows);
      });

      console.log('✅ [ShowsStore] Total fetched:', allFetchedShows.length, 'shows');

      // Deduplicate by _id (use Map for efficiency)
      const showsMap = new Map<string, Show>();
      allFetchedShows.forEach(show => showsMap.set(show._id, show));
      const uniqueShows = Array.from(showsMap.values());

      console.log('🔍 [ShowsStore] After deduplication:', uniqueShows.length, 'unique shows');

      // Sort shows: live first, then by scheduled time
      const sortedShows = uniqueShows
        .sort((a, b) => new Date(a.scheduledAt || 0).getTime() - new Date(b.scheduledAt || 0).getTime())
        .sort((a, b) => (b.isLive === a.isLive ? 0 : b.isLive ? 1 : -1));

      // Check if we have more shows (based on last page response)
      const lastPageResponse = responses[responses.length - 1];
      const lastPageShows = lastPageResponse.data?.data || [];
      const hasMore = lastPageShows.length === ITEMS_PER_PAGE;

      set({
        shows: sortedShows,
        page: currentPage,
        hasMore,
        isLoading: false,
      });

      console.log(`✅ [ShowsStore] Refresh complete! ${sortedShows.length} shows, page ${currentPage}, hasMore: ${hasMore}`);
    } catch (error: any) {
      console.error('❌ [ShowsStore] Error refreshing to current page:', error);
      set({
        error: error.message || 'Failed to refresh shows',
        isLoading: false,
      });
    }
  },

  // Reset state (useful for refresh)
  reset: () => {
    set({
      shows: [],
      page: 0,
      hasMore: true,
      isLoading: false,
      error: null,
    });
  },

  // Update a single show (for socket updates)
  updateShow: (showId: string, updates: Partial<Show>) => {
    set((state) => ({
      shows: state.shows.map((show) =>
        show._id === showId ? { ...show, ...updates } : show
      ),
    }));
  },

  // Update multiple shows (for socket refresh)
  updateShows: (newShows: Show[]) => {
    set({ shows: newShows });
  },

  // Computed selector: Get live shows
  getLiveShows: () => {
    const { shows } = get();
    return shows.filter((show) => show.isLive);
  },

  // Computed selector: Get upcoming shows
  getUpcomingShows: () => {
    const { shows } = get();
    const now = new Date();
    return shows.filter(
      (show) =>
        show.scheduledAt &&
        new Date(show.scheduledAt) > now &&
        !show.isLive
    );
  },
}));

// Selector hooks - return raw shows array, let component memoize filtering
export const useLiveShows = () => {
  return useShowsStore((state) => state.shows);
};

export const useUpcomingShows = () => {
  return useShowsStore((state) => state.shows);
};
