import { useEffect } from 'react';
import useNavbarStore from '@/stores/NavbarStore';

const useNavbarVisibility = () => {
  const { showNavbar } = useNavbarStore();

  useEffect(() => {
    showNavbar();
  }, [showNavbar]);
};

export default useNavbarVisibility;