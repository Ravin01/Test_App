const DEFAULT_LIMIT = 10;

// In-memory storage for search data
let searchData = {
  searchTerm: '',
  debouncedSearchTerm: '',
  selectedTab: 'shows',
  isInitialLoad: true,
  isRefreshing: false,
  
  results: {
    shows: [],
    videos: [],
    products: [],
    users: [],
  },
  
  pagination: {
    shows: {currentPage: 1, hasMore: false, limit: DEFAULT_LIMIT},
    videos: {currentPage: 1, hasMore: false, limit: DEFAULT_LIMIT},
    products: {currentPage: 1, hasMore: false, limit: DEFAULT_LIMIT},
    users: {currentPage: 1, hasMore: false, limit: 20},
  },
  
  loadingStates: {
    shows: false,
    videos: false,
    products: false,
    users: false,
    globalSearchChange: false,
  },
  
  errorStates: {
    shows: null,
    videos: null,
    products: null,
    users: null,
  },

  // Preloaded data from dashboard
  preloadedData: null
};

export const SearchDataStorage = {
  // Getters
  getSearchTerm: () => searchData.searchTerm,
  getDebouncedSearchTerm: () => searchData.debouncedSearchTerm,
  getSelectedTab: () => searchData.selectedTab,
  getIsInitialLoad: () => searchData.isInitialLoad,
  getIsRefreshing: () => searchData.isRefreshing,
  getResults: () => searchData.results,
  getPagination: () => searchData.pagination,
  getLoadingStates: () => searchData.loadingStates,
  getErrorStates: () => searchData.errorStates,
  getPreloadedData: () => searchData.preloadedData,

  // Setters
  setSearchTerm: (term) => { searchData.searchTerm = term; },
  setDebouncedSearchTerm: (term) => { searchData.debouncedSearchTerm = term; },
  setSelectedTab: (tab) => { searchData.selectedTab = tab; },
  setIsInitialLoad: (value) => { searchData.isInitialLoad = value; },
  setIsRefreshing: (value) => { searchData.isRefreshing = value; },
  
  setResults: (category, data, append = false) => {
    if (append) {
      searchData.results[category] = [...searchData.results[category], ...data];
    } else {
      searchData.results[category] = data;
    }
  },
  
  setPagination: (category, paginationData) => {
    searchData.pagination[category] = {
      ...searchData.pagination[category],
      ...paginationData
    };
  },
  
  setLoadingState: (category, isLoading) => {
    searchData.loadingStates[category] = isLoading;
  },
  
  setGlobalLoading: (isLoading) => {
    searchData.loadingStates.globalSearchChange = isLoading;
  },
  
  setErrorState: (category, error) => {
    searchData.errorStates[category] = error;
  },
  
  setPreloadedData: (data) => {
    searchData.preloadedData = data;
  },
  
  // Check if we have preloaded data for a category
  hasPreloadedData: (category) => {
    return searchData.preloadedData && 
           searchData.preloadedData[category] && 
           searchData.preloadedData[category].success;
  },
  
  // Get preloaded data for a category
  getPreloadedCategoryData: (category) => {
    return searchData.preloadedData ? searchData.preloadedData[category] : null;
  },
  
  // Reset all data
  reset: () => {
    searchData = {
      searchTerm: '',
      debouncedSearchTerm: '',
      selectedTab: 'shows',
      isInitialLoad: true,
      isRefreshing: false,
      
      results: {
        shows: [],
        videos: [],
        products: [],
        users: [],
      },
      
      pagination: {
        shows: {currentPage: 1, hasMore: false, limit: DEFAULT_LIMIT},
        videos: {currentPage: 1, hasMore: false, limit: DEFAULT_LIMIT},
        products: {currentPage: 1, hasMore: false, limit: DEFAULT_LIMIT},
        users: {currentPage: 1, hasMore: false, limit: 20},
      },
      
      loadingStates: {
        shows: false,
        videos: false,
        products: false,
        users: false,
        globalSearchChange: false,
      },
      
      errorStates: {
        shows: null,
        videos: null,
        products: null,
        users: null,
      },
      preloadedData: null
    };
  }
};