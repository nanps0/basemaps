import { Bounds, Point } from './bounds';
import * as Mercator from 'global-mercator';

export interface LatLon {
    lat: number;
    lon: number;
}

/** EPSG codes for commonly used projections */
export enum EPSG {
    /** Pseudo WebMercator */
    Google = 3857,
    Wgs84 = 4326,
    Nztm = 2193,
}

const EPSGTextMap: Record<string, EPSG> = {
    google: EPSG.Google,
    epsg3857: EPSG.Google,
    '3857': EPSG.Google,
    globalmercator: EPSG.Google,

    wgs84: EPSG.Wgs84,
    epsg4326: EPSG.Wgs84,
    '4326': EPSG.Wgs84,

    nztm: EPSG.Nztm,
    epsg2193: EPSG.Nztm,
    '2193': EPSG.Nztm,
};

export class Projection {
    /** Size of the earth EPSG:3857 constant */
    public static readonly A = 6378137.0;

    public static readonly GoogleScaleDenominator = 559082264.029;

    public static readonly Wgs84Bound = { lat: 85.0511287798066, lon: 180 };

    /** EPSG:3857 origin shift */
    public static readonly OriginShift = (2 * Math.PI * Projection.A) / 2.0;

    /** Tile size in pixels (Generally 256 or 512) */
    public readonly tileSize: number;

    /** Resolution of pixels/meter at zoom level 0 */
    public readonly initialResolution: number;

    public constructor(tileSize: number) {
        this.tileSize = tileSize;
        this.initialResolution = (2 * Math.PI * Projection.A) / this.tileSize;
    }

    /** Get the pixels / meter at a specified WebMercator zoom level */
    public getResolution(zoom: number): number {
        return this.initialResolution / 2 ** zoom;
    }

    /** Convert a XYZ tile into a screen bounding box */
    public getPixelsFromTile(x: number, y: number): Bounds {
        return new Bounds(x * this.tileSize, y * this.tileSize, this.tileSize, this.tileSize);
    }

    /**
     * Convert a google tile index into a quad key
     * @param tX tile X offset
     * @param tY tile Y offset
     * @param zoom WebMercator zoom level
     */
    public getQuadKeyFromTile(tX: number, tY: number, zoom: number): string {
        return Mercator.googleToQuadkey([tX, tY, zoom]);
    }
    /**
     * Convert a XYZ tile into the raster bounds for the tile
     * @param tX tile X offset
     * @param tY tile Y offset
     * @param zoom WebMercator zoom level
     */
    public getPixelsFromMeters(tX: number, tY: number, zoom: number): Point {
        const res = this.getResolution(zoom);
        const pX = (tX + Projection.OriginShift) / res;
        const pY = (tY + Projection.OriginShift) / res;
        return { x: pX, y: pY };
    }

    /**
     * Get the center of a XYZ tile in LatLon
     * @param tX Tile X offset
     * @param tY Tile Y offset
     * @param zoom WebMercator zoom level
     */
    public getLatLonCenterFromTile(tX: number, tY: number, zoom: number): LatLon {
        const [minX, minY, maxX, maxY] = Mercator.googleToBBox([tX, tY, zoom]);
        return {
            lat: (maxY + minY) / 2,
            lon: (maxX + minX) / 2,
        };
    }

    /**
     * Get the raster bounds for a WebMercator zoom level
     *
     * @param extent Extent in meters in the format of [minX,minY,maxX,maxY]
     * @param zoom Web mercator zoom level
     */
    public getPixelsBoundsFromMeters(extent: [number, number, number, number], zoom: number): Bounds {
        const upperLeftMeters = this.getPixelsFromMeters(extent[0], -extent[3], zoom);
        const lowerRightMeters = this.getPixelsFromMeters(extent[2], -extent[1], zoom);
        return Bounds.fromUpperLeftLowerRight(upperLeftMeters, lowerRightMeters);
    }

    /** Convert a EPSG code into `EPSG:<code>` */
    public static toEpsgString(epsg: EPSG): string {
        return `EPSG:${epsg}`;
    }

    /** parse a string returning the `EPSG` code **/
    public static parseEpsgString(text: string): EPSG | null {
        return EPSGTextMap[text.replace(/[\W_]/g, '').toLowerCase()] || null;
    }
}
