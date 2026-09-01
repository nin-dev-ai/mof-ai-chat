import React, { useState, useRef, useEffect } from "react";
import { GlobeAltIcon, PlusIcon } from "@heroicons/react/24/outline";
import AttachmentIcon from "../assets/icons/attachment-icn.svg";

export const PlusDropdown: React.FC<{
  onSelect: (option: "attachment" | "search") => void;
  t: (key: string) => string;
  title?: string;
}> = ({ onSelect, t, title }) => {
  const [open, setOpen] = useState(false);
  const [openUp, setOpenUp] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
   const handleClickOutside = (e: MouseEvent) => {
    const path = e.composedPath();

    if (
      dropdownRef.current &&
      buttonRef.current &&
      !path.includes(dropdownRef.current) &&
      !path.includes(buttonRef.current)
    ) {
      setOpen(false);
    }
  };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const spaceAbove = rect.top;
      const dropdownHeight = 100;
      if (spaceAbove < dropdownHeight) {
        setOpenUp(false);
      } else {
        setOpenUp(true);
      }
    }
  }, [open]);

  const onSelectHandler = (option: "attachment" | "search") => {
    onSelect(option);
    const event = new CustomEvent("select", {
      detail: option,
      bubbles: true,
      composed: true, // Ensure event crosses shadow DOM
    });
    dropdownRef.current?.dispatchEvent(event);

    setOpen(false);
  };

  return (
    <div className="relative inline-block">
      <button
        ref={buttonRef}
        onClick={() => setOpen((prev) => !prev)}
        title={title}
        className="p-2 text-[#9CA3AF] hover:text-[#C6A75D] hover:bg-[rgba(198,167,93,0.1)] rounded-full transition-all duration-200"
      >
        <PlusIcon className="h-6 w-6 " />
      </button>
      {open && (
        <div
          ref={dropdownRef}
          className={`absolute ${
            openUp ? "bottom-12" : "top-12"
          } right-0 w-44 bg-white border border-gray-300 rounded-2xl shadow-lg z-50`}
        >
          <button
            onClick={() => {
              onSelectHandler("attachment");
            }}
            className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-100 text-base"
          >
            <AttachmentIcon
              className="w-4 h-4"
              style={{ stroke: "currentColor", strokeWidth: 4 }}
            />
            <div className="text-[13px]">{t("Attachment")}</div>
          </button>
          <button
            onClick={() => {
              onSelectHandler("search");
            }}
            className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-100"
          >
            <GlobeAltIcon className="h-4 w-4" />
            <div className="text-[13px]">{t("WebSearch")}</div>
          </button>
        </div>
      )}
    </div>
  );
};
