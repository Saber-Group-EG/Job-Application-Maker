import { SidebarProvider, useSidebar } from "../context/SidebarContext";
import { Outlet } from "react-router";
import AppHeader from "./AppHeader";
import Backdrop from "./Backdrop";
import AppSidebar from "./AppSidebar";
import { useLocale } from "../context/LocaleContext";

const LayoutContent: React.FC = () => {
  const { isExpanded, isHovered, isMobileOpen } = useSidebar();
  const { dir } = useLocale();

  return (
    <div className="min-h-screen xl:flex">
      <div>
        <AppSidebar />
        <Backdrop />
      </div>
      <div
        className={`w-full transition-all duration-300 ease-in-out flex flex-col min-h-screen min-w-0 ${
          isExpanded || isHovered
            ? dir === 'ltr' ? 'lg:pl-[290px]' : 'lg:pr-[290px]'
            : dir === 'ltr' ? 'lg:pl-[90px]' : 'lg:pr-[90px]'
        } ${isMobileOpen ? (dir === 'ltr' ? 'pl-0' : 'pr-0') : ""}`}
      >
        <AppHeader />
        <div className="mx-auto flex-1 min-w-0 w-full max-w-full p-3 sm:p-4 md:p-5 xl:max-w-[1760px]">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

const AppLayout: React.FC = () => {
  return (
    <SidebarProvider>
      <LayoutContent />
    </SidebarProvider>
  );
};

export default AppLayout;