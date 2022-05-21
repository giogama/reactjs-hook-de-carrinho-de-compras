import { createContext, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem("@RocketShoes:cart");

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const prevCartRef = useRef<Product[]>();

  useEffect(() => {
    prevCartRef.current = cart;
  });

  const cartPreviousValue = prevCartRef.current ?? cart;

  useEffect(() => {
    if (cartPreviousValue != cart) {
      localStorage.setItem("@RocketShoes:cart", JSON.stringify(cart));
    }
  }, [cart, cartPreviousValue]);
 
  const addProduct = async (productId: number) => {
    try {
      const clonedCart = [...cart];

      const productExists = clonedCart.find(prod => prod.id === productId);
      const stock = await api.get(`stock/${productId}`);
      const stockAmount = stock.data.amount;
      const currentProductAmount = productExists ? productExists.amount : 0;
      const newAmount = currentProductAmount + 1;

      if (newAmount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      if (productExists) {
        productExists.amount = newAmount;
      } else {
        const product = await api.get(`products/${productId}`);
        const newProduct = {
          ...product.data,
          amount: 1
        };
        clonedCart.push(newProduct);
      }
      setCart(clonedCart);
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const clonedCart = [...cart];
      const productIndex = clonedCart.findIndex(product => product.id === productId);

      if (productIndex >= 0) {
        clonedCart.splice(productIndex, 1);
        setCart(clonedCart);
      } else {
        throw Error();
      }

    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0)
        return;

      const response = await api.get(`stock/${productId}`);
      const stockAmount = response.data.amount;
      
      if (amount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const clonedCart = [...cart];

      const productExists = clonedCart.find(prod => prod.id === productId);

      if (productExists) {
        productExists.amount = amount;
        setCart(clonedCart);
      } else {
        throw Error();
      }

    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
