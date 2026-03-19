import { useNavigate } from 'react-router-dom';
import { useApp } from '@/contexts/AppContext';
import { useEffect } from 'react';

const Index = () => {
  const { session } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    if (!session) {
      navigate('/auth');
    }
  }, [session, navigate]);

  // If session exists, Dashboard is rendered at "/" route
  return null;
};

export default Index;
