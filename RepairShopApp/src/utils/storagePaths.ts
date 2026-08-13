export const getAttendanceStoragePath = (
  userId: string,
  dateString: string,
  type: 'checkin' | 'checkout'
) => {
  return `${userId}/${dateString}-${type}.jpg`;
};
