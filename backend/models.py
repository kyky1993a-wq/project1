from datetime import datetime, date
from sqlalchemy import String, Text, Integer, Date, DateTime, ForeignKey, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from database import Base


class Diary(Base):
    __tablename__ = "diaries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    date: Mapped[date] = mapped_column(Date, nullable=False)
    keywords: Mapped[str] = mapped_column(Text, nullable=False)  # JSON 배열 문자열
    diary_text: Mapped[str] = mapped_column(Text, nullable=False)
    ai_provider: Mapped[str] = mapped_column(String(20), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    photos: Mapped[list["Photo"]] = relationship(
        "Photo", back_populates="diary", cascade="all, delete-orphan", order_by="Photo.upload_order"
    )
    onedrive_sync: Mapped["OneDriveSync | None"] = relationship(
        "OneDriveSync", back_populates="diary", uselist=False, cascade="all, delete-orphan"
    )


class Photo(Base):
    __tablename__ = "photos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    diary_id: Mapped[int] = mapped_column(Integer, ForeignKey("diaries.id", ondelete="CASCADE"), nullable=False)
    filename: Mapped[str] = mapped_column(String(255), nullable=False)
    original_name: Mapped[str] = mapped_column(String(255), nullable=False)
    file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    upload_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now())

    diary: Mapped["Diary"] = relationship("Diary", back_populates="photos")


class OneDriveSync(Base):
    __tablename__ = "onedrive_sync"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    diary_id: Mapped[int] = mapped_column(Integer, ForeignKey("diaries.id", ondelete="CASCADE"), unique=True, nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending | synced | failed
    synced_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    onedrive_folder_id: Mapped[str | None] = mapped_column(String(500), nullable=True)

    diary: Mapped["Diary"] = relationship("Diary", back_populates="onedrive_sync")
