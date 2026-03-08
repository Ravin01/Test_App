import { Platform, StatusBar, ToastAndroid } from "react-native";

// display date 
export const formatDateForDisplay = (utcISOString) => {
    if (!utcISOString) {
      return "";
    }
  
    try {
      const dateObject = new Date(utcISOString);
      if (isNaN(dateObject.getTime())) {
        return "";
      }
  
      const options = {
        year: 'numeric',  
        month: 'long',   
        day: 'numeric'   
      };
  
      return dateObject.toLocaleDateString(undefined, options);
  
    } catch (error) {
      console.error("Error formatting date for display:", error);
      return "";
    }
  };
  
export const formatTimeDayForDisplay = (utcISOString) => {
  if (!utcISOString) return "";

  try {
    const date = new Date(utcISOString);
    if (isNaN(date.getTime())) return "";

    const now = new Date();

    // Check if it's today
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    // Format time (e.g., "3:00 PM")
    const time = date.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    // Format day if not today
    const weekday = date.toLocaleDateString(undefined, { weekday: "long" });

    return isToday ? `Today, ${time}` : `${weekday}, ${time}`;
  } catch (error) {
    console.error("Error formatting time for display:", error);
    return "";
  }
};

// display time 
export const formatTimeForDisplay = (utcISOString) => {
    if (!utcISOString) {
      return "";
    }
  
    try {
      const dateObject = new Date(utcISOString);
      if (isNaN(dateObject.getTime())) {
        return "";
      }
  
      const options = {
        hour: 'numeric',    
        minute: '2-digit', 
        hour12: true       
      };
  
      return dateObject.toLocaleTimeString(undefined, options);
  
    } catch (error) {
      console.error("Error formatting time for display:", error);
      return "";
    }
  };
  
// show creation form
export const getUtcIsoStringFromLocal = (dateString, timeString) => {
  console.log("Input Date:", dateString, "Input Time:", timeString);

  const datePattern = /^(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])\/(19|20)\d\d$/;

  const cleanTime = timeString
    .replace(/\u202f/g, ' ')   // Replace Unicode narrow no-break space
    .replace(/\s+/g, ' ')      // Normalize spaces
    .trim()
    .toUpperCase()
    .match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s?(AM|PM)$/);

  if (!datePattern.test(dateString) || !cleanTime) {
    console.error("Invalid date or time format.");
    return null;
  }

  try {
    const [month, day, year] = dateString.split("/").map(Number);
    let hour = parseInt(cleanTime[1], 10);
    const minute = parseInt(cleanTime[2], 10);
    const meridian = cleanTime[3];

    if (meridian === "PM" && hour !== 12) hour += 12;
    if (meridian === "AM" && hour === 12) hour = 0;

    const localDate = new Date(year, month - 1, day, hour, minute, 0);

    if (isNaN(localDate.getTime())) {
      console.error("Invalid Date object after construction.");
      return null;
    }

    return localDate.toISOString();
  } catch (error) {
    console.error("Error converting to UTC ISO:", error);
    return null;
  }
};


  
// show edit form 
export const getLocalStringsFromUtcIso = (utcISOString) => {
  if (!utcISOString) {
    console.error("Invalid UTC ISO string provided (null or empty).");
    // Return default/empty values instead of null for easier state update
    return { date: '', time: '' };
  }
  try {
    const dateObject = new Date(utcISOString);
    if (isNaN(dateObject.getTime())) {
      console.error("Could not create a valid date from UTC ISO string:", utcISOString);
       // Return default/empty values
      return { date: '', time: '' };
    }

    // Extract LOCAL date components (YYYY-MM-DD)
    const year = dateObject.getFullYear();
    const month = String(dateObject.getMonth() + 1).padStart(2, '0');
    const day = String(dateObject.getDate()).padStart(2, '0');
    const formattedDate = `${year}-${month}-${day}`;

    // Extract LOCAL time components (HH:MM)
    const hours = String(dateObject.getHours()).padStart(2, '0');
    const minutes = String(dateObject.getMinutes()).padStart(2, '0');
    const formattedTime = `${hours}:${minutes}`;

    return {
      date: formattedDate,
      time: formattedTime,
    };
  } catch (error) {
    console.error("Error converting UTC ISO string to local date/time strings:", error);
     // Return default/empty values
    return { date: '', time: '' };
  }
};

// view scheduled show component 
export const formatScheduledDateTimeLocal = (scheduledAtUTCString) => {
  if (!scheduledAtUTCString) {
    return "Not scheduled";
  }

  try {
    const dateObject = new Date(scheduledAtUTCString);

    if (isNaN(dateObject.getTime())) {
      console.error("Invalid date string received:", scheduledAtUTCString);
      return "Invalid Date";
    }


    const dateOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    };

    const timeOptions = {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    };

    const formattedDate = dateObject.toLocaleDateString(undefined, dateOptions);
    const formattedTime = dateObject.toLocaleTimeString(undefined, timeOptions);


    return `${formattedDate} - ${formattedTime}`;

  } catch (error) {
    console.error("Error formatting scheduledAt date:", error, "Input:", scheduledAtUTCString);
    return "Error Formatting Date";
  }
};
// show creation form
  export const getUtcIsoStringFromEditLocal = (dateString, timeString) => {
    // Basic validation
    if (
      !dateString ||
      !timeString ||
      !/^\d{4}-\d{2}-\d{2}$/.test(dateString) ||
      !/^\d{2}:\d{2}$/.test(timeString)
    ) {
      console.error("Invalid date or time string format provided.");
      return null;
    }
  
    try {
      // Combine into a format that new Date() interprets as LOCAL time
      const localDateTimeString = `${dateString}T${timeString}:00`;
  
      // Create the Date object (represents the local time)
      const localDateObject = new Date(localDateTimeString);
  
      // Check if the created date is valid
      if (isNaN(localDateObject.getTime())) {
        console.error(
          "Could not create a valid date from strings:",
          localDateTimeString
        );
        return null;
      }
  
      // Convert to UTC ISO string
      const utcISOString = localDateObject.toISOString();
      return utcISOString;
    } catch (error) {
      console.error("Error converting local date/time to UTC ISO string:", error);
      return null;
    }
  };
export const getUtcIsoStringFromLocalEdit = (dateString, timeString) => {
  console.log("Input Date:", dateString, "Input Time:", timeString);

  // Validate date MM/DD/YYYY format (month first)
  const datePattern = /^(0[1-9]|1[0-2])\/(0[1-9]|[12][0-9]|3[01])\/(19|20)\d\d$/;

  const cleanTime = timeString
    .replace(/\u202f/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase()
    .match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?\s?(AM|PM)$/);

  if (!datePattern.test(dateString) || !cleanTime) {
    console.error("Invalid date or time format.");
    return null;
  }

  try {
    // Parse date as MM/DD/YYYY
    const [month, day, year] = dateString.split("/").map(Number);

    // Parse time
    let hour = parseInt(cleanTime[1], 10);
    const minute = parseInt(cleanTime[2], 10);
    const second = cleanTime[3] ? parseInt(cleanTime[3], 10) : 0;
    const meridian = cleanTime[4];

    // Convert to 24-hour time
    if (meridian === "PM" && hour !== 12) hour += 12;
    if (meridian === "AM" && hour === 12) hour = 0;

    // Create Date in local timezone
    const localDate = new Date(year, month - 1, day, hour, minute, second);

    if (isNaN(localDate.getTime())) {
      console.error("Invalid Date object after construction.");
      return null;
    }

    // Convert to UTC ISO string
    return localDate.toISOString();
  } catch (error) {
    console.error("Error converting to UTC ISO:", error);
    return null;
  }
};

  export const Toast = msg => {
    // Validate message to prevent crashes
    const message = msg != null && String(msg).trim() !== '' 
      ? String(msg).trim() 
      : null;
    
    if (Platform.OS === 'android' && message) {
      return ToastAndroid.show(message, ToastAndroid.SHORT);
    }
  };
    export const formatFollowerCount = (count) => {
      if (!count) return '0';
      if (count >= 1000000) {
        return (count / 1000000).toFixed(1).replace('.0', '') + 'M';
      } else if (count >= 100000) {
        return (count / 100000).toFixed(1).replace('.0', '') + 'L';
      } else if (count >= 1000) {
        return (count / 1000).toFixed(1).replace('.0', '') + 'k';
      }
      return count.toString();
    }
    export const getStatusBarHeight = () => {
      return Platform.OS === 'ios' ? 20 : StatusBar.currentHeight || 0;
    };

    export const formatCurrency = amount => {
      if (amount == null || isNaN(amount)) return '';
      return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(amount);
    };


export const handleGoBack = (navigation,lastTap) => {
  const now = Date.now();
  if (now - lastTap < 500) return; // Ignore double tap
  lastTap = now;
  navigation.goBack();
  // lastTap=0;
};
