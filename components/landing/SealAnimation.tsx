import Image from 'next/image';

export default function SealAnimation() {
  return (
    <div className="relative w-full max-w-sm flex items-center justify-center mr-8 -translate-y-8">
      <Image
        src="/seal-with-envelope.png"
        alt="Seal delivering secure mail"
        width={400}
        height={400}
        className="w-full h-auto object-contain"
        priority
      />
    </div>
  );
}
