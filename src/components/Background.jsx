// Background layer that uses album art and gradients for atmosphere.
const Background = ({ imageUrl }) => {
  return (
    <div className="absolute inset-0">
      <div
        className="absolute inset-0 bg-cover bg-center blur-3xl opacity-70 scale-110"
        style={{
          backgroundImage: imageUrl ? `url(${imageUrl})` : "none",
        }}
      />
      <div className="absolute inset-0 " />
    </div>
  );
};

export default Background;

// bg-gradient-to-b from-[#2e8a92]/70 via-[#0f2325]/80 to-[#081415]