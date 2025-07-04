import { Navigate, useLocation } from 'react-router-dom';
import { JSX } from 'react';

export const RedirectIfNotAuthenticatedRoute = ({
  children,
}: {
  children: JSX.Element;
}) => {
  const authorizedToken = localStorage.getItem('authDysonToken');
  const location = useLocation();

  if (!authorizedToken) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};
