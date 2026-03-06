import { Outlet } from 'react-router-dom';
import Layout from './Layout';

export function LayoutWrapper() {
  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}
