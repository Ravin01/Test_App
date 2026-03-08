import { useEffect, useState } from "react";

function useDebounce ( value, delay ) {

    const [ debouncedValue , setDebouncedValue ] = useState(value);

    useEffect(()=>{
        const handler = setTimeout(()=> setDebouncedValue(value), delay);

        // clean up on unmount
        return () => clearTimeout(handler);
    },[ value, delay]);

    return debouncedValue;
}

export default useDebounce;