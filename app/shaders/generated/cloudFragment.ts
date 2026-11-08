// @ts-nocheck
/* eslint-disable */
// GENERATED — TSL port of the original GLSL (cloudFragmentShader), produced with three's GLSL→TSL
// transpiler (examples/jsm/transpiler) and then adapted: uniforms arrive as TSL
// uniform nodes via `reference()`, varyings are injected by the host material.
// This file is now the source of truth; hand-edit as needed.

export default function build( TSL: any, uniforms: any, varyings: any, lib: any ): Record<string, any> {

	const { reference, floor, Fn, mul, sub, vec3, fract, vec4, abs, step, dot, mix, float, Loop, sin, If, add, smoothstep, cos, normalize, select, cross, mat2, max, div, min, atan, clamp, acos, log, Discard } = TSL;
	const { vPosition, vSphereDir, vNormal, vWorldNormal } = varyings;

	const u_time = reference( 'value', 'float', uniforms[ 'u_time' ] );
	const u_seed = reference( 'value', 'vec3', uniforms[ 'u_seed' ] );
	const u_cloudCoverage = reference( 'value', 'float', uniforms[ 'u_cloudCoverage' ] );
	const u_cloudOpacity = reference( 'value', 'float', uniforms[ 'u_cloudOpacity' ] );
	const u_cloudSwirl = reference( 'value', 'float', uniforms[ 'u_cloudSwirl' ] );
	const u_cloudBands = reference( 'value', 'float', uniforms[ 'u_cloudBands' ] );
	const u_cloudWarp = reference( 'value', 'float', uniforms[ 'u_cloudWarp' ] );
	const u_lod = reference( 'value', 'float', uniforms[ 'u_lod' ] );
	const u_sunDirection = reference( 'value', 'vec3', uniforms[ 'u_sunDirection' ] );
	const u_sunDirectionLocal = reference( 'value', 'vec3', uniforms[ 'u_sunDirectionLocal' ] );
	const u_tidallyLocked = reference( 'value', 'float', uniforms[ 'u_tidallyLocked' ] );
	const u_spiralTightness = reference( 'value', 'float', uniforms[ 'u_spiralTightness' ] );
	const u_spiralArms = reference( 'value', 'float', uniforms[ 'u_spiralArms' ] );
	const u_spiralStrength = reference( 'value', 'float', uniforms[ 'u_spiralStrength' ] );
	const u_eyeSize = reference( 'value', 'float', uniforms[ 'u_eyeSize' ] );
	const u_wrapRange = reference( 'value', 'float', uniforms[ 'u_wrapRange' ] );
	const u_wrapPower = reference( 'value', 'float', uniforms[ 'u_wrapPower' ] );
	const u_sunIntensity = reference( 'value', 'float', uniforms[ 'u_sunIntensity' ] );

	// Perlin noise for smooth, detailed cloud patterns

	const mod289v3 = /*@__PURE__*/ Fn( ( [ x ] ) => {

		return x.sub( floor( x.mul( 1.0 / 289.0 ) ).mul( 289.0 ) );

	}, { x: 'vec3', return: 'vec3' } );

	const mod289v4 = /*@__PURE__*/ Fn( ( [ x ] ) => {

		return x.sub( floor( x.mul( 1.0 / 289.0 ) ).mul( 289.0 ) );

	}, { x: 'vec4', return: 'vec4' } );

	const permute = /*@__PURE__*/ Fn( ( [ x ] ) => {

		return mod289v4( x.mul( 34.0 ).add( 10.0 ).mul( x ) );

	}, { x: 'vec4', return: 'vec4' } );

	const taylorInvSqrt = /*@__PURE__*/ Fn( ( [ r ] ) => {

		return sub( 1.79284291400159, mul( 0.85373472095314, r ) );

	}, { r: 'vec4', return: 'vec4' } );

	const fade = /*@__PURE__*/ Fn( ( [ t ] ) => {

		return t.mul( t ).mul( t ).mul( t.mul( t.mul( 6.0 ).sub( 15.0 ) ).add( 10.0 ) );

	}, { t: 'vec3', return: 'vec3' } );

	const cnoise = /*@__PURE__*/ Fn( ( [ P ] ) => {

		const Pi0 = floor( P ).toVar();
		const Pi1 = Pi0.add( vec3( 1.0 ) ).toVar();
		Pi0.assign( mod289v3( Pi0 ) );
		Pi1.assign( mod289v3( Pi1 ) );
		const Pf0 = fract( P );
		const Pf1 = Pf0.sub( vec3( 1.0 ) );
		const ix = vec4( Pi0.x, Pi1.x, Pi0.x, Pi1.x );
		const iy = vec4( Pi0.yy, Pi1.yy );
		const iz0 = Pi0.zzzz;
		const iz1 = Pi1.zzzz;
		const ixy = permute( permute( ix ).add( iy ) );
		const ixy0 = permute( ixy.add( iz0 ) );
		const ixy1 = permute( ixy.add( iz1 ) );
		const gx0 = ixy0.mul( 1.0 / 7.0 ).toVar();
		const gy0 = fract( floor( gx0 ).mul( 1.0 / 7.0 ) ).sub( 0.5 ).toVar();
		gx0.assign( fract( gx0 ) );
		const gz0 = vec4( 0.5 ).sub( abs( gx0 ) ).sub( abs( gy0 ) );
		const sz0 = step( gz0, vec4( 0.0 ) );
		gx0.subAssign( sz0.mul( step( 0.0, gx0 ).sub( 0.5 ) ) );
		gy0.subAssign( sz0.mul( step( 0.0, gy0 ).sub( 0.5 ) ) );
		const gx1 = ixy1.mul( 1.0 / 7.0 ).toVar();
		const gy1 = fract( floor( gx1 ).mul( 1.0 / 7.0 ) ).sub( 0.5 ).toVar();
		gx1.assign( fract( gx1 ) );
		const gz1 = vec4( 0.5 ).sub( abs( gx1 ) ).sub( abs( gy1 ) );
		const sz1 = step( gz1, vec4( 0.0 ) );
		gx1.subAssign( sz1.mul( step( 0.0, gx1 ).sub( 0.5 ) ) );
		gy1.subAssign( sz1.mul( step( 0.0, gy1 ).sub( 0.5 ) ) );
		const g000 = vec3( gx0.x, gy0.x, gz0.x );
		const g100 = vec3( gx0.y, gy0.y, gz0.y );
		const g010 = vec3( gx0.z, gy0.z, gz0.z );
		const g110 = vec3( gx0.w, gy0.w, gz0.w );
		const g001 = vec3( gx1.x, gy1.x, gz1.x );
		const g101 = vec3( gx1.y, gy1.y, gz1.y );
		const g011 = vec3( gx1.z, gy1.z, gz1.z );
		const g111 = vec3( gx1.w, gy1.w, gz1.w );
		const norm0 = taylorInvSqrt( vec4( dot( g000, g000 ), dot( g010, g010 ), dot( g100, g100 ), dot( g110, g110 ) ) );
		const norm1 = taylorInvSqrt( vec4( dot( g001, g001 ), dot( g011, g011 ), dot( g101, g101 ), dot( g111, g111 ) ) );
		const n000 = norm0.x.mul( dot( g000, Pf0 ) );
		const n010 = norm0.y.mul( dot( g010, vec3( Pf0.x, Pf1.y, Pf0.z ) ) );
		const n100 = norm0.z.mul( dot( g100, vec3( Pf1.x, Pf0.yz ) ) );
		const n110 = norm0.w.mul( dot( g110, vec3( Pf1.xy, Pf0.z ) ) );
		const n001 = norm1.x.mul( dot( g001, vec3( Pf0.xy, Pf1.z ) ) );
		const n011 = norm1.y.mul( dot( g011, vec3( Pf0.x, Pf1.yz ) ) );
		const n101 = norm1.z.mul( dot( g101, vec3( Pf1.x, Pf0.y, Pf1.z ) ) );
		const n111 = norm1.w.mul( dot( g111, Pf1 ) );
		const fade_xyz = fade( Pf0 );
		const n_z = mix( vec4( n000, n100, n010, n110 ), vec4( n001, n101, n011, n111 ), fade_xyz.z );
		const n_yz = mix( n_z.xy, n_z.zw, fade_xyz.y );
		const n_xyz = mix( n_yz.x, n_yz.y, fade_xyz.x );

		return mul( 2.2, n_xyz );

	}, { P: 'vec3', return: 'float' } );

	// [0,1] wrapper for pipeline compatibility

	const pnoise3d = /*@__PURE__*/ Fn( ( [ p ] ) => {

		return cnoise( p ).mul( 0.5 ).add( 0.5 );

	}, { p: 'vec3', return: 'float' } );

	// 5-octave Perlin FBM — smoother than hash noise, better cloud shapes

	const cloudFBM = /*@__PURE__*/ Fn( ( [ p_immutable, freq ] ) => {

		const p = p_immutable.toVar();
		const v = float( 0.0 ), a = float( 0.5 );
		p.assign( p.mul( freq ) );

		Loop( 5, ( { i } ) => {

			v.addAssign( pnoise3d( p ).mul( a ) );
			p.assign( p.mul( 2.03 ).add( vec3( float( i ).mul( 13.7 ), float( i ).mul( 7.3 ), float( i ).mul( 19.1 ) ) ) );
			a.mulAssign( 0.5 );

		} );

		return v;

	}, { p: 'vec3', freq: 'float', return: 'float' } );

	// Sin-modulated cloud noise — wispy organic shapes via Perlin

	const cloudNoise = /*@__PURE__*/ Fn( ( [ p_immutable, freq ] ) => {

		const p = p_immutable.toVar();
		const v = float( 0.0 ), a = float( 0.5 );
		p.assign( p.mul( freq ) );

		Loop( 5, () => {

			const n = pnoise3d( p ).toVar();
			v.addAssign( a.mul( sin( n.mul( 5.0 ) ).mul( 0.5 ).add( 0.5 ) ) );
			p.assign( p.mul( 2.02 ).add( vec3( 31.7, 17.3, 53.1 ) ) );
			a.mulAssign( 0.5 );

		} );

		return v;

	}, { p: 'vec3', freq: 'float', return: 'float' } );

	// Ridged cloud noise — creates sharp frontal boundaries

	const cloudRidged = /*@__PURE__*/ Fn( ( [ p_immutable, freq ] ) => {

		const p = p_immutable.toVar();
		const v = float( 0.0 ), a = float( 0.5 );
		p.assign( p.mul( freq ) );

		Loop( 4, () => {

			const n = pnoise3d( p ).toVar();
			n.assign( mul( 2.0, sub( 0.5, abs( sub( 0.5, n ) ) ) ) );
			v.addAssign( a.mul( n ) );
			p.assign( p.mul( 2.03 ).add( vec3( 13.7, 29.3, 41.1 ) ) );
			a.mulAssign( 0.5 );

		} );

		return v;

	}, { p: 'vec3', freq: 'float', return: 'float' } );

	const fragMain = /*@__PURE__*/ Fn( () => {

		const p = vPosition.add( u_seed.mul( 50.0 ) ).toVar();
		const t = u_time.mul( 0.001 );
		const signedLat = vPosition.y.toVar();
		const absLat = abs( signedLat ).toVar();

		// Eyeball: redefine "latitude" as distance from terminator ring

		If( u_tidallyLocked.greaterThan( 0.5 ), () => {

			const sunAngle = dot( vPosition, u_sunDirectionLocal );
			signedLat.assign( sunAngle.negate() );

			// terminator at 0, sub-stellar at -1, anti-stellar at +1

			absLat.assign( abs( signedLat ) );

		} );

		// ── Weather system: large-scale pressure cells (Perlin) ──

		const weatherP = p.mul( 2.0 ).toVar();
		const warpX = pnoise3d( weatherP.mul( 0.3 ).add( vec3( 11.0 ) ) );
		const warpZ = pnoise3d( weatherP.mul( 0.3 ).add( vec3( 47.0 ) ) );
		weatherP.addAssign( vec3( warpX.sub( 0.5 ), 0.0, warpZ.sub( 0.5 ) ).mul( u_cloudWarp ).mul( 3.0 ) );

		// ── Coriolis: cyclonic rotation per hemisphere ──

		const equatorNoise = pnoise3d( p.mul( 3.0 ).add( vec3( 17.0 ) ) ).mul( 0.12 );
		const coriolisSign = mix( - 1.0, 1.0, smoothstep( float( -0.1 ).add( equatorNoise ), add( 0.1, equatorNoise ), signedLat ) );
		const coriolisStrength = smoothstep( 0.0, 0.4, absLat );
		const windSpeed = sub( 1.0, absLat.mul( 0.5 ) );

		// Weather cell density modulates cyclone strength

		const weatherCell = cloudNoise( weatherP, 0.4 );
		const swirlAngle = coriolisSign.mul( coriolisStrength ).mul( u_cloudSwirl ).mul( add( 0.5, weatherCell ) ).add( t.mul( windSpeed ).mul( 0.3 ) );
		const cs = cos( swirlAngle.mul( 0.18 ) );
		const sn = sin( swirlAngle.mul( 0.18 ) );
		const cloudP = weatherP.toVar();

		If( u_tidallyLocked.greaterThan( 0.5 ), () => {

			// Eyeball: swirl around sub-stellar axis instead of Y axis

			const sunDir = normalize( u_sunDirectionLocal );
			const upRef = select( abs( sunDir.y ).lessThan( 0.999 ), vec3( 0.0, 1.0, 0.0 ), vec3( 1.0, 0.0, 0.0 ) );
			const T = normalize( cross( upRef, sunDir ) );
			const B = cross( sunDir, T );
			const ct = dot( cloudP, T );
			const cb = dot( cloudP, B );
			cloudP.addAssign( T.mul( cs.mul( ct ).add( sn.mul( cb ) ).sub( ct ) ).add( B.mul( sn.negate().mul( ct ).add( cs.mul( cb ) ).sub( cb ) ) ) );

		} ).Else( () => {

			cloudP.xz.assign( mat2( cs, sn.negate(), sn, cs ).mul( cloudP.xz ) );

		} );

		// ── Layer 1: Cumulus masses — domain-warped Perlin FBM ──

		const w1 = cloudFBM( cloudP.mul( 0.3 ), 0.8 );
		const w2 = pnoise3d( cloudP.mul( 0.5 ).add( vec3( 43.0 ) ) );
		const warpedP = cloudP.add( vec3( w1.sub( 0.5 ).mul( u_cloudWarp ).mul( 1.5 ), t.mul( 0.2 ), w2.sub( 0.5 ).mul( u_cloudWarp ) ) );
		const cumulus = cloudNoise( warpedP.add( vec3( t.mul( 0.08 ) ) ), 1.2 );

		// ── Layer 2: Cirrus wisps — stretched Perlin for streaky appearance ──

		const cirrusP = p.mul( 7.0 ).add( vec3( t.mul( 0.15 ), 0.0, t.mul( 0.1 ) ) ).toVar();
		cirrusP.y.mulAssign( 0.25 );

		// heavy longitude stretch = thin streaks

		const cirrus = cloudFBM( cirrusP, 1.0 ).toVar();

		// Sharp threshold for thin wisps

		cirrus.assign( smoothstep( 0.55, 0.68, cirrus ).mul( 0.5 ) );

		// ── Layer 3: Frontal boundaries — ridged noise for sharp cloud fronts ──

		const fronts = cloudRidged( warpedP.mul( 0.7 ).add( vec3( t.mul( 0.05 ), 31.0, 0.0 ) ), 1.5 );

		// ── Layer 4: Fine convective texture ──

		const convective = cloudNoise( warpedP.mul( 3.0 ).add( vec3( t.mul( 0.1 ), 71.0, 0.0 ) ), 2.5 ).mul( 0.15 );

		// ── Combine ──

		const clouds = cumulus.mul( 0.55 ).add( fronts.mul( 0.2 ) ).add( convective ).toVar();

		// ITCZ: tropical convergence band (narrow, scaled by bands control)

		const itczWidth = div( 0.08, max( u_cloudBands.mul( 0.5 ), 0.5 ) );
		clouds.addAssign( smoothstep( itczWidth, 0.0, absLat ).mul( 0.06 ) );

		// Hadley cell banding (strength scaled by bands control)

		const bandStr = mul( 0.04, min( u_cloudBands.div( 5.0 ), 1.0 ) );
		clouds.addAssign( sin( absLat.mul( u_cloudBands ).mul( 6.0 ).add( w1.mul( 2.5 ) ) ).mul( bandStr ) );

		// Eyeball: sub-stellar hurricane + terminator convergence

		If( u_tidallyLocked.greaterThan( 0.5 ), () => {

			const sunAngle = dot( vPosition, u_sunDirectionLocal );

			// ── Sub-stellar hurricane spiral ──

			const sunDir = normalize( u_sunDirectionLocal );
			const upRef = select( abs( sunDir.y ).lessThan( 0.999 ), vec3( 0.0, 1.0, 0.0 ), vec3( 1.0, 0.0, 0.0 ) );
			const spiralT = normalize( cross( upRef, sunDir ) );
			const spiralB = cross( sunDir, spiralT );
			const azimuth = atan( dot( vPosition, spiralB ), dot( vPosition, spiralT ) );
			const distFromCenter = acos( clamp( sunAngle, - 1.0, 1.0 ) );

			// angular distance from sub-stellar
			// Logarithmic spiral: tighter near eye, widening outward (like real hurricanes)

			const logDist = log( max( distFromCenter, 0.01 ).mul( 8.0 ).add( 1.0 ) );
			const spiralPhase = azimuth.add( logDist.mul( u_spiralTightness ) ).toVar();

			// Domain warp the spiral with noise — breaks up the geometric regularity

			const warpA = pnoise3d( p.mul( 3.0 ).add( vec3( 53.0 ) ) ).mul( 0.6 );
			const warpB = pnoise3d( p.mul( 5.0 ).add( vec3( 91.0 ) ) ).mul( 0.3 );
			spiralPhase.addAssign( warpA.add( warpB ) );

			// Soft cloud bands, not hard arms — wider bands further out

			const bandWidth = mix( 0.4, 0.7, smoothstep( 0.0, 1.0, distFromCenter ) );
			const spiralArm = sin( spiralPhase.mul( u_spiralArms ) ).mul( 0.5 ).add( 0.5 ).toVar();
			spiralArm.assign( smoothstep( sub( 0.5, bandWidth.mul( 0.5 ) ), add( 0.5, bandWidth.mul( 0.5 ) ), spiralArm ) );

			// Feathered trailing edges: add fine detail noise that erodes the bands

			const feather = pnoise3d( p.mul( 8.0 ).add( vec3( 37.0 ) ) ).mul( 0.4 ).add( pnoise3d( p.mul( 14.0 ).add( vec3( 71.0 ) ) ).mul( 0.2 ) );
			spiralArm.assign( clamp( spiralArm.add( feather ).sub( 0.2 ), 0.0, 1.0 ) );

			// Spiral strength: strong near eye wall, fading toward terminator

			const eyeWall = smoothstep( u_eyeSize.mul( 0.5 ), u_eyeSize.mul( 1.7 ), distFromCenter );
			const outerFade = smoothstep( 1.3, 0.2, distFromCenter );
			clouds.addAssign( spiralArm.mul( eyeWall ).mul( outerFade ).mul( u_spiralStrength ) );

			// Clear eye at dead center

			const eyeClearing = smoothstep( u_eyeSize, u_eyeSize.mul( 0.4 ), distFromCenter );
			clouds.mulAssign( sub( 1.0, eyeClearing.mul( 0.8 ) ) );

			// Mild terminator convergence band

			clouds.addAssign( smoothstep( 0.35, 0.0, abs( sunAngle ) ).mul( 0.04 ) );

		} );

		// Cirrus wisps on top

		clouds.assign( max( clouds, cirrus ) );

		// Coverage threshold

		clouds.assign( smoothstep( u_cloudCoverage, u_cloudCoverage.add( 0.15 ), clouds ) );

		// ── Edge erosion: ragged boundaries (Perlin for smooth erosion) ──

		const edgeNoise = pnoise3d( p.mul( 16.0 ).add( vec3( t.mul( 0.03 ) ) ) );
		const edgeMask = smoothstep( 0.0, 0.2, clouds ).mul( smoothstep( 0.3, 0.05, clouds ) );
		clouds.subAssign( edgeMask.mul( edgeNoise ).mul( 0.4 ) );
		clouds.assign( max( clouds, 0.0 ) );

		// Polar / anti-stellar clearing

		If( u_tidallyLocked.greaterThan( 0.5 ), () => {

			// Eyeball: only clear on anti-stellar side (signedLat > 0), keep thick cap at sub-stellar

			const antiStellarFade = smoothstep( 0.75, 0.95, max( signedLat, 0.0 ) );
			clouds.mulAssign( sub( 1.0, antiStellarFade ) );

		} ).Else( () => {

			clouds.mulAssign( smoothstep( 0.95, 0.75, absLat ) );

		} );

		// ── Lighting ──

		const sunDot = dot( vWorldNormal, u_sunDirection );
		const diff = max( sunDot, 0.0 ).mul( 0.8 ).add( 0.2 );
		const selfShadow = sub( 1.0, clouds.mul( 0.15 ) );
		const warmCloud = vec3( 0.98, 0.97, 0.94 );
		const coolCloud = vec3( 0.85, 0.88, 0.95 );
		const cloudColor = mix( coolCloud, warmCloud, diff ).mul( diff ).mul( selfShadow ).mul( u_sunIntensity );

		// Fade clouds into shadow on dark side

		const dayFade = smoothstep( - 0.1, 0.15, sunDot );
		const alpha = clouds.mul( u_cloudOpacity ).mul( dayFade );

		If( alpha.lessThan( 0.01 ), () => {

			Discard();

		} );

		return vec4( cloudColor, alpha );

	} );
	return { u_time, u_seed, u_cloudCoverage, u_cloudOpacity, u_cloudSwirl, u_cloudBands, u_cloudWarp, u_lod, u_sunDirection, u_sunDirectionLocal, u_tidallyLocked, u_spiralTightness, u_spiralArms, u_spiralStrength, u_eyeSize, u_wrapRange, u_wrapPower, u_sunIntensity, mod289v3, mod289v4, permute, taylorInvSqrt, fade, cnoise, pnoise3d, cloudFBM, cloudNoise, cloudRidged, fragMain };

}
