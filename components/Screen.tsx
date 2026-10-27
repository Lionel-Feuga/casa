import { AvatarMenu } from "./AvatarMenu";
import { Presence } from "./Presence";

// En-tête commun : présence (ou autre info) à gauche, avatar à droite, titre en Bagel Fat One.
export function Screen({
  title,
  left,
  meta,
  children,
}: {
  title: string;
  left?: React.ReactNode;
  meta?: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <header className="top">
        <div className="hello">
          {left ?? <Presence />}
          <AvatarMenu />
        </div>
        <h1 className="ttl">{title}</h1>
        {meta && <p className="meta">{meta}</p>}
      </header>
      <main className="content">{children}</main>
    </>
  );
}
