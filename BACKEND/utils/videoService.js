const generateMockMeetingLink = () => {
  const randomId = Math.random().toString(36).substring(2, 10);
  return `https://mock-meet.com/${randomId}`;
};

module.exports = { generateMockMeetingLink };
