import React, { createContext, useContext, useEffect, useState } from "react";
import axios from "axios";
import { AuthContext } from "./AuthContext";
import { socketurl } from "../../Config";
import { CloudSnow } from "lucide-react-native";
// Create a new context for the cart
const CartContext = createContext();

export const CartProvider = ({ children }) => {
    const { user }:any = useContext(AuthContext);
    const [cart, setCart] = useState(null);
    const [pendingChanges, setPendingChanges] = useState(false);

    // Fetch the cart from t backend and set the cart data
    useEffect(() => {
        if (user && user._id) {
            const fetchCart = async () => {
                try {
                    const res = await axios.get(`${socketurl}/api/cart`, {
                        params: { userId: user._id },
                        withCredentials: true,
                    });
                    
                    setCart(res.data);
                } catch (error) {
                    // console.error("Error fetching cart:", error);
                }
            };
            fetchCart();
        }
    }, [user]);

    // Sync cart with the backend by sending only product IDs and quantities
    const syncCartWithBackend = async () => {
        if (!user || !user._id) return;
        try {
            // Format the cart data to only include p2roduct _id and quantity
            const formattedCart = {
                userId: user._id,
                cart: {
                    products: cart.products.map((item) => ({
                        product: item.product._id, // Only send product._id
                        quantity: item.quantity,
                    })),
                },
            };
            // console.log(formattedCart)
            const res = await axios.put(
                `${socketurl}/api/cart/update`, // Update cart endpoint
                formattedCart,
                { withCredentials: true }
            );
            // Assume the backend returns the cart with fully populated product data.
            setCart(res.data);
            setPendingChanges(false);
        } catch (error) {
            console.error("Error syncing cart with backend:", error);
        }
    };

    // Note: Pass the complete product object (populated data) instead of just an ID.
    const addProduct = (product, quantity = 1) => {
        setCart((prevCart) => {
            let newCart = prevCart ? { ...prevCart } : { user: user._id, products: [] };
            // Check if the product already exists in the cart
            const index = newCart.products.findIndex(
                (item) => item.product._id.toString() === product._id.toString()
            );
            if (index > -1) {
                newCart.products[index].quantity += quantity;
            } else {
                newCart.products.push({ product, quantity });
            }
            setPendingChanges(true);
            return newCart;
        });
    };

    // Update product quantity locally (cart still holds the populated product object)
    const updateProduct = (productId, quantity) => {
        // console.log(cart)
        setCart((prevCart) => {
            // console.log(prevCart)
            if (!prevCart) return prevCart;
            // console.log(productId,quantity)
            let newCart = { ...prevCart };
            const index = newCart.products.findIndex(
                (item) => item.product._id.toString() === productId
            );
            // console.log(index)
            if (index !== -1) {
                if (quantity <= 0) {
                    newCart.products.splice(index, 1);
                } else {
                    newCart.products[index].quantity = quantity;
                }
            }
            setPendingChanges(true);
            return newCart;
        });
    };

    // Remove a product locally (using product._id for comparison)
    const removeProduct = (productId) => {
        setCart((prevCart) => {
            if (!prevCart) return prevCart;
            let newCart = { ...prevCart };
            newCart.products = newCart.products.filter(
                (item) => item.product._id.toString() !== productId
            );
            setPendingChanges(true);
            return newCart;
        });
    };

    // Clear the local cart
    const clearCart = () => {
        setCart((prevCart) => {
            if (!prevCart) return prevCart;
            let newCart = { ...prevCart, products: [] };
            setPendingChanges(true);
            return newCart;
        });
    };

    // Periodically sync cart with the backend
    useEffect(() => {
        const interval = setInterval(() => {
            if (pendingChanges && cart) {
                syncCartWithBackend();
            }
        }, 5000); // Sync every 5 seconds (adjust as needed)
        return () => clearInterval(interval);
    }, [pendingChanges, cart, user]);

    return (
        <CartContext.Provider
            value={{
                cart,
                addProduct,
                updateProduct,
                removeProduct,
                clearCart,
                syncCartWithBackend,
                setCart,
            }}
        >
            {children}
        </CartContext.Provider>
    );
};

export const useCart = () => useContext(CartContext);
