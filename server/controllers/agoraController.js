import pkg from 'agora-token';
const { RtcTokenBuilder, RtcRole } = pkg;

export const generateToken = (req, res) => {
  try {
    const { channelName } = req.body;
    const uid = 0;
    const role = RtcRole.PUBLISHER;
    const expireTime = 3600;
    const currentTime = Math.floor(Date.now() / 1000);
    const privilegeExpireTime = currentTime + expireTime;

    const token = RtcTokenBuilder.buildTokenWithUid(
      process.env.AGORA_APP_ID,
      process.env.AGORA_CERTIFICATE,
      channelName,
      uid,
      role,
      expireTime,
      privilegeExpireTime
    );

    res.status(200).json({ token });
  } catch (err) {
    res.status(500).json({ message: 'Failed to generate token', error: err.message });
  }
};