import{U as Ct,c as Tr,N as Pt,S as Ar,C as Xe,F as Ba,M as tn,V as Ue,R as Rr,e as rt,w as tt,a as gt,l as Ei,b as Ga,W as xi,d as Dt,f as lt,L as jt,H as Gt,D as Et,B as Mt,g as pn,h as Un,p as br,i as nn,j as Dn,k as Cr,m as vt,O as Ha,n as it,E as Pr,o as at,P as un,A as Dr,q as Bn,r as Ut,s as Qt,t as an,u as hn,v as Yt,x as Ln,y as Lr,z as wr,G as mn,I as xt,J as ii,K as $t,Q as Mi,T as Ur,X as Ir,Y as sn,Z as yr,_ as Nr,$ as Fr,a0 as Or,a1 as Br,a2 as Gr,a3 as Hr,a4 as Vr,a5 as kr,a6 as Wr,a7 as zr,a8 as Xr,a9 as Yr,aa as Kr,ab as qr,ac as Zr,ad as $r,ae as Gn,af as Sn,ag as jr,ah as Xt,ai as Qr,aj as Jr,ak as si,al as eo,am as li,an as to,ao as no,ap as io,aq as Va,ar as ze,as as ao,at as ro,au as yt,av as An,aw as Rn,ax as ka,ay as It,az as fn,aA as Ot,aB as oo,aC as Wa,aD as za,aE as Xa,aF as wn,aG as Ya,aH as Ka,aI as qa,aJ as Za,aK as so,aL as lo,aM as co,aN as fo,aO as $a,aP as uo,aQ as po,aR as ho,aS as Hn,aT as Vn,aU as kn,aV as Wn,aW as Ti,aX as Ai,aY as Ri,aZ as bi,a_ as Ci,a$ as Pi,b0 as Di,b1 as Li,b2 as wi,b3 as Ui,b4 as Ii,b5 as yi,b6 as Ni,b7 as Fi,b8 as Oi,b9 as Bi,ba as Gi,bb as Hi,bc as Vi,bd as ki,be as Wi,bf as zi,bg as Xi,bh as Yi,bi as Ki,bj as qi,bk as Zi,bl as $i,bm as ji,bn as Qi,bo as Ji,bp as ea,bq as mo,br as _o,bs as go,bt as vo,bu as So,bv as Eo,bw as xo,bx as Mo,by as ta,bz as To,bA as bn,bB as Ao,bC as na,bD as ia,bE as aa,bF as ja,bG as Ro,bH as In,bI as bo,bJ as Co,bK as Qa,bL as ci,bM as ai,bN as Ja,bO as er,bP as Po,bQ as tr,bR as nr,bS as ir,bT as ar,bU as rr,bV as or,bW as sr,bX as ra,bY as lr,bZ as zn,b_ as Xn,b$ as Do,c0 as Lo,c1 as oa,c2 as _t,c3 as wo,c4 as _n,c5 as rn,c6 as Cn,c7 as Uo,c8 as Io,c9 as yo,ca as No,cb as Fo,cc as Oo,cd as Bo,ce as Go,cf as Ho,cg as Vo,ch as en,ci as Jt,cj as sa,ck as la,cl as ko,cm as Wo,cn as Ze,co as ca,cp as Yn,cq as zo,cr as Xo,cs as Kn,ct as Yo,cu as Ko,cv as qo,cw as Zo,cx as qn,cy as $o,cz as jo,cA as fa,cB as Qo,cC as Jo,cD as da,cE as Zn}from"./index-Bda_z6kq.js";function cr(){let e=null,n=!1,t=null,i=null;function o(r,f){t(r,f),i=e.requestAnimationFrame(o)}return{start:function(){n!==!0&&t!==null&&(i=e.requestAnimationFrame(o),n=!0)},stop:function(){e.cancelAnimationFrame(i),n=!1},setAnimationLoop:function(r){t=r},setContext:function(r){e=r}}}function es(e){const n=new WeakMap;function t(m,P){const A=m.array,G=m.usage,D=A.byteLength,h=e.createBuffer();e.bindBuffer(P,h),e.bufferData(P,A,G),m.onUploadCallback();let x;if(A instanceof Float32Array)x=e.FLOAT;else if(typeof Float16Array<"u"&&A instanceof Float16Array)x=e.HALF_FLOAT;else if(A instanceof Uint16Array)m.isFloat16BufferAttribute?x=e.HALF_FLOAT:x=e.UNSIGNED_SHORT;else if(A instanceof Int16Array)x=e.SHORT;else if(A instanceof Uint32Array)x=e.UNSIGNED_INT;else if(A instanceof Int32Array)x=e.INT;else if(A instanceof Int8Array)x=e.BYTE;else if(A instanceof Uint8Array)x=e.UNSIGNED_BYTE;else if(A instanceof Uint8ClampedArray)x=e.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+A);return{buffer:h,type:x,bytesPerElement:A.BYTES_PER_ELEMENT,version:m.version,size:D}}function i(m,P,A){const G=P.array,D=P.updateRanges;if(e.bindBuffer(A,m),D.length===0)e.bufferSubData(A,0,G);else{D.sort((x,S)=>x.start-S.start);let h=0;for(let x=1;x<D.length;x++){const S=D[h],I=D[x];I.start<=S.start+S.count+1?S.count=Math.max(S.count,I.start+I.count-S.start):(++h,D[h]=I)}D.length=h+1;for(let x=0,S=D.length;x<S;x++){const I=D[x];e.bufferSubData(A,I.start*G.BYTES_PER_ELEMENT,G,I.start,I.count)}P.clearUpdateRanges()}P.onUploadCallback()}function o(m){return m.isInterleavedBufferAttribute&&(m=m.data),n.get(m)}function r(m){m.isInterleavedBufferAttribute&&(m=m.data);const P=n.get(m);P&&(e.deleteBuffer(P.buffer),n.delete(m))}function f(m,P){if(m.isInterleavedBufferAttribute&&(m=m.data),m.isGLBufferAttribute){const G=n.get(m);(!G||G.version<m.version)&&n.set(m,{buffer:m.buffer,type:m.type,bytesPerElement:m.elementSize,version:m.version});return}const A=n.get(m);if(A===void 0)n.set(m,t(m,P));else if(A.version<m.version){if(A.size!==m.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");i(A.buffer,m,P),A.version=m.version}}return{get:o,remove:r,update:f}}var ts=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,ns=`#ifdef USE_ALPHAHASH
	const float ALPHA_HASH_SCALE = 0.05;
	float hash2D( vec2 value ) {
		return fract( 1.0e4 * sin( 17.0 * value.x + 0.1 * value.y ) * ( 0.1 + abs( sin( 13.0 * value.y + value.x ) ) ) );
	}
	float hash3D( vec3 value ) {
		return hash2D( vec2( hash2D( value.xy ), value.z ) );
	}
	float getAlphaHashThreshold( vec3 position ) {
		float maxDeriv = max(
			length( dFdx( position.xyz ) ),
			length( dFdy( position.xyz ) )
		);
		float pixScale = 1.0 / ( ALPHA_HASH_SCALE * maxDeriv );
		vec2 pixScales = vec2(
			exp2( floor( log2( pixScale ) ) ),
			exp2( ceil( log2( pixScale ) ) )
		);
		vec2 alpha = vec2(
			hash3D( floor( pixScales.x * position.xyz ) ),
			hash3D( floor( pixScales.y * position.xyz ) )
		);
		float lerpFactor = fract( log2( pixScale ) );
		float x = ( 1.0 - lerpFactor ) * alpha.x + lerpFactor * alpha.y;
		float a = min( lerpFactor, 1.0 - lerpFactor );
		vec3 cases = vec3(
			x * x / ( 2.0 * a * ( 1.0 - a ) ),
			( x - 0.5 * a ) / ( 1.0 - a ),
			1.0 - ( ( 1.0 - x ) * ( 1.0 - x ) / ( 2.0 * a * ( 1.0 - a ) ) )
		);
		float threshold = ( x < ( 1.0 - a ) )
			? ( ( x < a ) ? cases.x : cases.y )
			: cases.z;
		return clamp( threshold , 1.0e-6, 1.0 );
	}
#endif`,is=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,as=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,rs=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,os=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,ss=`#ifdef USE_AOMAP
	float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;
	reflectedLight.indirectDiffuse *= ambientOcclusion;
	#if defined( USE_CLEARCOAT ) 
		clearcoatSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_SHEEN ) 
		sheenSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD )
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
	#endif
#endif`,ls=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,cs=`#ifdef USE_BATCHING
	#if ! defined( GL_ANGLE_multi_draw )
	#define gl_DrawID _gl_DrawID
	uniform int _gl_DrawID;
	#endif
	uniform highp sampler2D batchingTexture;
	uniform highp usampler2D batchingIdTexture;
	mat4 getBatchingMatrix( const in float i ) {
		int size = textureSize( batchingTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( batchingTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( batchingTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( batchingTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( batchingTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
	float getIndirectIndex( const in int i ) {
		int size = textureSize( batchingIdTexture, 0 ).x;
		int x = i % size;
		int y = i / size;
		return float( texelFetch( batchingIdTexture, ivec2( x, y ), 0 ).r );
	}
#endif
#ifdef USE_BATCHING_COLOR
	uniform sampler2D batchingColorTexture;
	vec4 getBatchingColor( const in float i ) {
		int size = textureSize( batchingColorTexture, 0 ).x;
		int j = int( i );
		int x = j % size;
		int y = j / size;
		return texelFetch( batchingColorTexture, ivec2( x, y ), 0 );
	}
#endif`,fs=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,ds=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,us=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,ps=`float G_BlinnPhong_Implicit( ) {
	return 0.25;
}
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
vec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( specularColor, 1.0, dotVH );
	float G = G_BlinnPhong_Implicit( );
	float D = D_BlinnPhong( shininess, dotNH );
	return F * ( G * D );
} // validated`,hs=`#ifdef USE_IRIDESCENCE
	const mat3 XYZ_TO_REC709 = mat3(
		 3.2404542, -0.9692660,  0.0556434,
		-1.5371385,  1.8760108, -0.2040259,
		-0.4985314,  0.0415560,  1.0572252
	);
	vec3 Fresnel0ToIor( vec3 fresnel0 ) {
		vec3 sqrtF0 = sqrt( fresnel0 );
		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );
	}
	vec3 IorToFresnel0( vec3 transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) );
	}
	float IorToFresnel0( float transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ));
	}
	vec3 evalSensitivity( float OPD, vec3 shift ) {
		float phase = 2.0 * PI * OPD * 1.0e-9;
		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );
		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );
		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );
		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * var );
		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) );
		xyz /= 1.0685e-7;
		vec3 rgb = XYZ_TO_REC709 * xyz;
		return rgb;
	}
	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) {
		vec3 I;
		float iridescenceIOR = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );
		float sinTheta2Sq = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) );
		float cosTheta2Sq = 1.0 - sinTheta2Sq;
		if ( cosTheta2Sq < 0.0 ) {
			return vec3( 1.0 );
		}
		float cosTheta2 = sqrt( cosTheta2Sq );
		float R0 = IorToFresnel0( iridescenceIOR, outsideIOR );
		float R12 = F_Schlick( R0, 1.0, cosTheta1 );
		float T121 = 1.0 - R12;
		float phi12 = 0.0;
		if ( iridescenceIOR < outsideIOR ) phi12 = PI;
		float phi21 = PI - phi12;
		vec3 baseIOR = Fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) );		vec3 R1 = IorToFresnel0( baseIOR, iridescenceIOR );
		vec3 R23 = F_Schlick( R1, 1.0, cosTheta2 );
		vec3 phi23 = vec3( 0.0 );
		if ( baseIOR[ 0 ] < iridescenceIOR ) phi23[ 0 ] = PI;
		if ( baseIOR[ 1 ] < iridescenceIOR ) phi23[ 1 ] = PI;
		if ( baseIOR[ 2 ] < iridescenceIOR ) phi23[ 2 ] = PI;
		float OPD = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;
		vec3 phi = vec3( phi21 ) + phi23;
		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 );
		vec3 r123 = sqrt( R123 );
		vec3 Rs = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 );
		vec3 C0 = R12 + Rs;
		I = C0;
		vec3 Cm = Rs - T121;
		for ( int m = 1; m <= 2; ++ m ) {
			Cm *= r123;
			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi );
			I += Cm * Sm;
		}
		return max( I, vec3( 0.0 ) );
	}
#endif`,ms=`#ifdef USE_BUMPMAP
	uniform sampler2D bumpMap;
	uniform float bumpScale;
	vec2 dHdxy_fwd() {
		vec2 dSTdx = dFdx( vBumpMapUv );
		vec2 dSTdy = dFdy( vBumpMapUv );
		float Hll = bumpScale * texture2D( bumpMap, vBumpMapUv ).x;
		float dBx = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdx ).x - Hll;
		float dBy = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdy ).x - Hll;
		return vec2( dBx, dBy );
	}
	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
		vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );
		vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );
		vec3 vN = surf_norm;
		vec3 R1 = cross( vSigmaY, vN );
		vec3 R2 = cross( vN, vSigmaX );
		float fDet = dot( vSigmaX, R1 ) * faceDirection;
		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
		return normalize( abs( fDet ) * surf_norm - vGrad );
	}
#endif`,_s=`#if NUM_CLIPPING_PLANES > 0
	vec4 plane;
	#ifdef ALPHA_TO_COVERAGE
		float distanceToPlane, distanceGradient;
		float clipOpacity = 1.0;
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
			distanceGradient = fwidth( distanceToPlane ) / 2.0;
			clipOpacity *= smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			if ( clipOpacity == 0.0 ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			float unionClipOpacity = 1.0;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
				distanceGradient = fwidth( distanceToPlane ) / 2.0;
				unionClipOpacity *= 1.0 - smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			}
			#pragma unroll_loop_end
			clipOpacity *= 1.0 - unionClipOpacity;
		#endif
		diffuseColor.a *= clipOpacity;
		if ( diffuseColor.a == 0.0 ) discard;
	#else
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			bool clipped = true;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;
			}
			#pragma unroll_loop_end
			if ( clipped ) discard;
		#endif
	#endif
#endif`,gs=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,vs=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,Ss=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,Es=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#endif`,xs=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#endif`,Ms=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec4 vColor;
#endif`,Ts=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	vColor = vec4( 1.0 );
#endif
#ifdef USE_COLOR_ALPHA
	vColor *= color;
#elif defined( USE_COLOR )
	vColor.rgb *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.rgb *= instanceColor.rgb;
#endif
#ifdef USE_BATCHING_COLOR
	vColor *= getBatchingColor( getIndirectIndex( gl_DrawID ) );
#endif`,As=`#define PI 3.141592653589793
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement( a ) ( 1.0 - saturate( a ) )
float pow2( const in float x ) { return x*x; }
vec3 pow2( const in vec3 x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }
float average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }
highp float rand( const in vec2 uv ) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract( sin( sn ) * c );
}
#ifdef HIGH_PRECISION
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	float precisionSafeLength( vec3 v ) {
		float maxComponent = max3( abs( v ) );
		return length( v / maxComponent ) * maxComponent;
	}
#endif
struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};
struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};
#ifdef USE_ALPHAHASH
	varying vec3 vPosition;
#endif
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
vec3 inverseTransformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( vec4( dir, 0.0 ) * matrix ).xyz );
}
bool isPerspectiveMatrix( mat4 m ) {
	return m[ 2 ][ 3 ] == - 1.0;
}
vec2 equirectUv( in vec3 dir ) {
	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;
	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
	return vec2( u, v );
}
vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
	return RECIPROCAL_PI * diffuseColor;
}
vec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
float F_Schlick( const in float f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
} // validated`,Rs=`#ifdef ENVMAP_TYPE_CUBE_UV
	#define cubeUV_minMipLevel 4.0
	#define cubeUV_minTileSize 16.0
	float getFace( vec3 direction ) {
		vec3 absDirection = abs( direction );
		float face = - 1.0;
		if ( absDirection.x > absDirection.z ) {
			if ( absDirection.x > absDirection.y )
				face = direction.x > 0.0 ? 0.0 : 3.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		} else {
			if ( absDirection.z > absDirection.y )
				face = direction.z > 0.0 ? 2.0 : 5.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		}
		return face;
	}
	vec2 getUV( vec3 direction, float face ) {
		vec2 uv;
		if ( face == 0.0 ) {
			uv = vec2( direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 1.0 ) {
			uv = vec2( - direction.x, - direction.z ) / abs( direction.y );
		} else if ( face == 2.0 ) {
			uv = vec2( - direction.x, direction.y ) / abs( direction.z );
		} else if ( face == 3.0 ) {
			uv = vec2( - direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 4.0 ) {
			uv = vec2( - direction.x, direction.z ) / abs( direction.y );
		} else {
			uv = vec2( direction.x, direction.y ) / abs( direction.z );
		}
		return 0.5 * ( uv + 1.0 );
	}
	vec3 bilinearCubeUV( sampler2D envMap, vec3 direction, float mipInt ) {
		float face = getFace( direction );
		float filterInt = max( cubeUV_minMipLevel - mipInt, 0.0 );
		mipInt = max( mipInt, cubeUV_minMipLevel );
		float faceSize = exp2( mipInt );
		highp vec2 uv = getUV( direction, face ) * ( faceSize - 2.0 ) + 1.0;
		if ( face > 2.0 ) {
			uv.y += faceSize;
			face -= 3.0;
		}
		uv.x += face * faceSize;
		uv.x += filterInt * 3.0 * cubeUV_minTileSize;
		uv.y += 4.0 * ( exp2( CUBEUV_MAX_MIP ) - faceSize );
		uv.x *= CUBEUV_TEXEL_WIDTH;
		uv.y *= CUBEUV_TEXEL_HEIGHT;
		#ifdef texture2DGradEXT
			return texture2DGradEXT( envMap, uv, vec2( 0.0 ), vec2( 0.0 ) ).rgb;
		#else
			return texture2D( envMap, uv ).rgb;
		#endif
	}
	#define cubeUV_r0 1.0
	#define cubeUV_m0 - 2.0
	#define cubeUV_r1 0.8
	#define cubeUV_m1 - 1.0
	#define cubeUV_r4 0.4
	#define cubeUV_m4 2.0
	#define cubeUV_r5 0.305
	#define cubeUV_m5 3.0
	#define cubeUV_r6 0.21
	#define cubeUV_m6 4.0
	float roughnessToMip( float roughness ) {
		float mip = 0.0;
		if ( roughness >= cubeUV_r1 ) {
			mip = ( cubeUV_r0 - roughness ) * ( cubeUV_m1 - cubeUV_m0 ) / ( cubeUV_r0 - cubeUV_r1 ) + cubeUV_m0;
		} else if ( roughness >= cubeUV_r4 ) {
			mip = ( cubeUV_r1 - roughness ) * ( cubeUV_m4 - cubeUV_m1 ) / ( cubeUV_r1 - cubeUV_r4 ) + cubeUV_m1;
		} else if ( roughness >= cubeUV_r5 ) {
			mip = ( cubeUV_r4 - roughness ) * ( cubeUV_m5 - cubeUV_m4 ) / ( cubeUV_r4 - cubeUV_r5 ) + cubeUV_m4;
		} else if ( roughness >= cubeUV_r6 ) {
			mip = ( cubeUV_r5 - roughness ) * ( cubeUV_m6 - cubeUV_m5 ) / ( cubeUV_r5 - cubeUV_r6 ) + cubeUV_m5;
		} else {
			mip = - 2.0 * log2( 1.16 * roughness );		}
		return mip;
	}
	vec4 textureCubeUV( sampler2D envMap, vec3 sampleDir, float roughness ) {
		float mip = clamp( roughnessToMip( roughness ), cubeUV_m0, CUBEUV_MAX_MIP );
		float mipF = fract( mip );
		float mipInt = floor( mip );
		vec3 color0 = bilinearCubeUV( envMap, sampleDir, mipInt );
		if ( mipF == 0.0 ) {
			return vec4( color0, 1.0 );
		} else {
			vec3 color1 = bilinearCubeUV( envMap, sampleDir, mipInt + 1.0 );
			return vec4( mix( color0, color1, mipF ), 1.0 );
		}
	}
#endif`,bs=`vec3 transformedNormal = objectNormal;
#ifdef USE_TANGENT
	vec3 transformedTangent = objectTangent;
#endif
#ifdef USE_BATCHING
	mat3 bm = mat3( batchingMatrix );
	transformedNormal /= vec3( dot( bm[ 0 ], bm[ 0 ] ), dot( bm[ 1 ], bm[ 1 ] ), dot( bm[ 2 ], bm[ 2 ] ) );
	transformedNormal = bm * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = bm * transformedTangent;
	#endif
#endif
#ifdef USE_INSTANCING
	mat3 im = mat3( instanceMatrix );
	transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );
	transformedNormal = im * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = im * transformedTangent;
	#endif
#endif
transformedNormal = normalMatrix * transformedNormal;
#ifdef FLIP_SIDED
	transformedNormal = - transformedNormal;
#endif
#ifdef USE_TANGENT
	transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz;
	#ifdef FLIP_SIDED
		transformedTangent = - transformedTangent;
	#endif
#endif`,Cs=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,Ps=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,Ds=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,Ls=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,ws="gl_FragColor = linearToOutputTexel( gl_FragColor );",Us=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,Is=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vec3 cameraToFrag;
		if ( isOrthographic ) {
			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToFrag = normalize( vWorldPosition - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( cameraToFrag, worldNormal );
		#else
			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
		#endif
	#else
		vec3 reflectVec = vReflect;
	#endif
	#ifdef ENVMAP_TYPE_CUBE
		vec4 envColor = textureCube( envMap, envMapRotation * vec3( flipEnvMap * reflectVec.x, reflectVec.yz ) );
		#ifdef ENVMAP_BLENDING_MULTIPLY
			outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_MIX )
			outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_ADD )
			outgoingLight += envColor.xyz * specularStrength * reflectivity;
		#endif
	#endif
#endif`,ys=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform float flipEnvMap;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
#endif`,Ns=`#ifdef USE_ENVMAP
	uniform float reflectivity;
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		varying vec3 vWorldPosition;
		uniform float refractionRatio;
	#else
		varying vec3 vReflect;
	#endif
#endif`,Fs=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,Os=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vWorldPosition = worldPosition.xyz;
	#else
		vec3 cameraToVertex;
		if ( isOrthographic ) {
			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
		}
		vec3 worldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vReflect = reflect( cameraToVertex, worldNormal );
		#else
			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
		#endif
	#endif
#endif`,Bs=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,Gs=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,Hs=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,Vs=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,ks=`#ifdef USE_GRADIENTMAP
	uniform sampler2D gradientMap;
#endif
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	float dotNL = dot( normal, lightDirection );
	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );
	#ifdef USE_GRADIENTMAP
		return vec3( texture2D( gradientMap, coord ).r );
	#else
		vec2 fw = fwidth( coord ) * 0.5;
		return mix( vec3( 0.7 ), vec3( 1.0 ), smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ) );
	#endif
}`,Ws=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,zs=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,Xs=`varying vec3 vViewPosition;
struct LambertMaterial {
	vec3 diffuseColor;
	float specularStrength;
};
void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Lambert
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,Ys=`uniform bool receiveShadow;
uniform vec3 ambientLightColor;
#if defined( USE_LIGHT_PROBES )
	uniform vec3 lightProbe[ 9 ];
#endif
vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {
	float x = normal.x, y = normal.y, z = normal.z;
	vec3 result = shCoefficients[ 0 ] * 0.886227;
	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;
	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );
	return result;
}
vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {
	vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );
	return irradiance;
}
vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {
	vec3 irradiance = ambientLightColor;
	return irradiance;
}
float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
	float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
	if ( cutoffDistance > 0.0 ) {
		distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
	}
	return distanceFalloff;
}
float getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {
	return smoothstep( coneCosine, penumbraCosine, angleCosine );
}
#if NUM_DIR_LIGHTS > 0
	struct DirectionalLight {
		vec3 direction;
		vec3 color;
	};
	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
	void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {
		light.color = directionalLight.color;
		light.direction = directionalLight.direction;
		light.visible = true;
	}
#endif
#if NUM_POINT_LIGHTS > 0
	struct PointLight {
		vec3 position;
		vec3 color;
		float distance;
		float decay;
	};
	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
	void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = pointLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float lightDistance = length( lVector );
		light.color = pointLight.color;
		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );
		light.visible = ( light.color != vec3( 0.0 ) );
	}
#endif
#if NUM_SPOT_LIGHTS > 0
	struct SpotLight {
		vec3 position;
		vec3 direction;
		vec3 color;
		float distance;
		float decay;
		float coneCos;
		float penumbraCos;
	};
	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];
	void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = spotLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float angleCos = dot( light.direction, spotLight.direction );
		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );
		if ( spotAttenuation > 0.0 ) {
			float lightDistance = length( lVector );
			light.color = spotLight.color * spotAttenuation;
			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );
			light.visible = ( light.color != vec3( 0.0 ) );
		} else {
			light.color = vec3( 0.0 );
			light.visible = false;
		}
	}
#endif
#if NUM_RECT_AREA_LIGHTS > 0
	struct RectAreaLight {
		vec3 color;
		vec3 position;
		vec3 halfWidth;
		vec3 halfHeight;
	};
	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;
	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];
#endif
#if NUM_HEMI_LIGHTS > 0
	struct HemisphereLight {
		vec3 direction;
		vec3 skyColor;
		vec3 groundColor;
	};
	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {
		float dotNL = dot( normal, hemiLight.direction );
		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
		return irradiance;
	}
#endif`,Ks=`#ifdef USE_ENVMAP
	vec3 getIBLIrradiance( const in vec3 normal ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * worldNormal, 1.0 );
			return PI * envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 reflectVec = reflect( - viewDir, normal );
			reflectVec = normalize( mix( reflectVec, normal, pow4( roughness ) ) );
			reflectVec = inverseTransformDirection( reflectVec, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * reflectVec, roughness );
			return envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	#ifdef USE_ANISOTROPY
		vec3 getIBLAnisotropyRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
			#ifdef ENVMAP_TYPE_CUBE_UV
				vec3 bentNormal = cross( bitangent, viewDir );
				bentNormal = normalize( cross( bentNormal, bitangent ) );
				bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
				return getIBLRadiance( viewDir, bentNormal, roughness );
			#else
				return vec3( 0.0 );
			#endif
		}
	#endif
#endif`,qs=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,Zs=`varying vec3 vViewPosition;
struct ToonMaterial {
	vec3 diffuseColor;
};
void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Toon
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,$s=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,js=`varying vec3 vViewPosition;
struct BlinnPhongMaterial {
	vec3 diffuseColor;
	vec3 specularColor;
	float specularShininess;
	float specularStrength;
};
void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;
}
void RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_BlinnPhong
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,Qs=`PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.diffuseContribution = diffuseColor.rgb * ( 1.0 - metalnessFactor );
material.metalness = metalnessFactor;
vec3 dxy = max( abs( dFdx( nonPerturbedNormal ) ), abs( dFdy( nonPerturbedNormal ) ) );
float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );
material.roughness = max( roughnessFactor, 0.0525 );material.roughness += geometryRoughness;
material.roughness = min( material.roughness, 1.0 );
#ifdef IOR
	material.ior = ior;
	#ifdef USE_SPECULAR
		float specularIntensityFactor = specularIntensity;
		vec3 specularColorFactor = specularColor;
		#ifdef USE_SPECULAR_COLORMAP
			specularColorFactor *= texture2D( specularColorMap, vSpecularColorMapUv ).rgb;
		#endif
		#ifdef USE_SPECULAR_INTENSITYMAP
			specularIntensityFactor *= texture2D( specularIntensityMap, vSpecularIntensityMapUv ).a;
		#endif
		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor );
	#else
		float specularIntensityFactor = 1.0;
		vec3 specularColorFactor = vec3( 1.0 );
		material.specularF90 = 1.0;
	#endif
	material.specularColor = min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor;
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
#else
	material.specularColor = vec3( 0.04 );
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
	material.specularF90 = 1.0;
#endif
#ifdef USE_CLEARCOAT
	material.clearcoat = clearcoat;
	material.clearcoatRoughness = clearcoatRoughness;
	material.clearcoatF0 = vec3( 0.04 );
	material.clearcoatF90 = 1.0;
	#ifdef USE_CLEARCOATMAP
		material.clearcoat *= texture2D( clearcoatMap, vClearcoatMapUv ).x;
	#endif
	#ifdef USE_CLEARCOAT_ROUGHNESSMAP
		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vClearcoatRoughnessMapUv ).y;
	#endif
	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.0525 );
	material.clearcoatRoughness += geometryRoughness;
	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );
#endif
#ifdef USE_DISPERSION
	material.dispersion = dispersion;
#endif
#ifdef USE_IRIDESCENCE
	material.iridescence = iridescence;
	material.iridescenceIOR = iridescenceIOR;
	#ifdef USE_IRIDESCENCEMAP
		material.iridescence *= texture2D( iridescenceMap, vIridescenceMapUv ).r;
	#endif
	#ifdef USE_IRIDESCENCE_THICKNESSMAP
		material.iridescenceThickness = (iridescenceThicknessMaximum - iridescenceThicknessMinimum) * texture2D( iridescenceThicknessMap, vIridescenceThicknessMapUv ).g + iridescenceThicknessMinimum;
	#else
		material.iridescenceThickness = iridescenceThicknessMaximum;
	#endif
#endif
#ifdef USE_SHEEN
	material.sheenColor = sheenColor;
	#ifdef USE_SHEEN_COLORMAP
		material.sheenColor *= texture2D( sheenColorMap, vSheenColorMapUv ).rgb;
	#endif
	material.sheenRoughness = clamp( sheenRoughness, 0.0001, 1.0 );
	#ifdef USE_SHEEN_ROUGHNESSMAP
		material.sheenRoughness *= texture2D( sheenRoughnessMap, vSheenRoughnessMapUv ).a;
	#endif
#endif
#ifdef USE_ANISOTROPY
	#ifdef USE_ANISOTROPYMAP
		mat2 anisotropyMat = mat2( anisotropyVector.x, anisotropyVector.y, - anisotropyVector.y, anisotropyVector.x );
		vec3 anisotropyPolar = texture2D( anisotropyMap, vAnisotropyMapUv ).rgb;
		vec2 anisotropyV = anisotropyMat * normalize( 2.0 * anisotropyPolar.rg - vec2( 1.0 ) ) * anisotropyPolar.b;
	#else
		vec2 anisotropyV = anisotropyVector;
	#endif
	material.anisotropy = length( anisotropyV );
	if( material.anisotropy == 0.0 ) {
		anisotropyV = vec2( 1.0, 0.0 );
	} else {
		anisotropyV /= material.anisotropy;
		material.anisotropy = saturate( material.anisotropy );
	}
	material.alphaT = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );
	material.anisotropyT = tbn[ 0 ] * anisotropyV.x + tbn[ 1 ] * anisotropyV.y;
	material.anisotropyB = tbn[ 1 ] * anisotropyV.x - tbn[ 0 ] * anisotropyV.y;
#endif`,Js=`uniform sampler2D dfgLUT;
struct PhysicalMaterial {
	vec3 diffuseColor;
	vec3 diffuseContribution;
	vec3 specularColor;
	vec3 specularColorBlended;
	float roughness;
	float metalness;
	float specularF90;
	float dispersion;
	#ifdef USE_CLEARCOAT
		float clearcoat;
		float clearcoatRoughness;
		vec3 clearcoatF0;
		float clearcoatF90;
	#endif
	#ifdef USE_IRIDESCENCE
		float iridescence;
		float iridescenceIOR;
		float iridescenceThickness;
		vec3 iridescenceFresnel;
		vec3 iridescenceF0;
		vec3 iridescenceFresnelDielectric;
		vec3 iridescenceFresnelMetallic;
	#endif
	#ifdef USE_SHEEN
		vec3 sheenColor;
		float sheenRoughness;
	#endif
	#ifdef IOR
		float ior;
	#endif
	#ifdef USE_TRANSMISSION
		float transmission;
		float transmissionAlpha;
		float thickness;
		float attenuationDistance;
		vec3 attenuationColor;
	#endif
	#ifdef USE_ANISOTROPY
		float anisotropy;
		float alphaT;
		vec3 anisotropyT;
		vec3 anisotropyB;
	#endif
};
vec3 clearcoatSpecularDirect = vec3( 0.0 );
vec3 clearcoatSpecularIndirect = vec3( 0.0 );
vec3 sheenSpecularDirect = vec3( 0.0 );
vec3 sheenSpecularIndirect = vec3(0.0 );
vec3 Schlick_to_F0( const in vec3 f, const in float f90, const in float dotVH ) {
    float x = clamp( 1.0 - dotVH, 0.0, 1.0 );
    float x2 = x * x;
    float x5 = clamp( x * x2 * x2, 0.0, 0.9999 );
    return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 );
}
float V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {
	float a2 = pow2( alpha );
	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
	return 0.5 / max( gv + gl, EPSILON );
}
float D_GGX( const in float alpha, const in float dotNH ) {
	float a2 = pow2( alpha );
	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;
	return RECIPROCAL_PI * a2 / pow2( denom );
}
#ifdef USE_ANISOTROPY
	float V_GGX_SmithCorrelated_Anisotropic( const in float alphaT, const in float alphaB, const in float dotTV, const in float dotBV, const in float dotTL, const in float dotBL, const in float dotNV, const in float dotNL ) {
		float gv = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) );
		float gl = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) );
		float v = 0.5 / ( gv + gl );
		return v;
	}
	float D_GGX_Anisotropic( const in float alphaT, const in float alphaB, const in float dotNH, const in float dotTH, const in float dotBH ) {
		float a2 = alphaT * alphaB;
		highp vec3 v = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH );
		highp float v2 = dot( v, v );
		float w2 = a2 / v2;
		return RECIPROCAL_PI * a2 * pow2 ( w2 );
	}
#endif
#ifdef USE_CLEARCOAT
	vec3 BRDF_GGX_Clearcoat( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material) {
		vec3 f0 = material.clearcoatF0;
		float f90 = material.clearcoatF90;
		float roughness = material.clearcoatRoughness;
		float alpha = pow2( roughness );
		vec3 halfDir = normalize( lightDir + viewDir );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float dotNH = saturate( dot( normal, halfDir ) );
		float dotVH = saturate( dot( viewDir, halfDir ) );
		vec3 F = F_Schlick( f0, f90, dotVH );
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
		return F * ( V * D );
	}
#endif
vec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 f0 = material.specularColorBlended;
	float f90 = material.specularF90;
	float roughness = material.roughness;
	float alpha = pow2( roughness );
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( f0, f90, dotVH );
	#ifdef USE_IRIDESCENCE
		F = mix( F, material.iridescenceFresnel, material.iridescence );
	#endif
	#ifdef USE_ANISOTROPY
		float dotTL = dot( material.anisotropyT, lightDir );
		float dotTV = dot( material.anisotropyT, viewDir );
		float dotTH = dot( material.anisotropyT, halfDir );
		float dotBL = dot( material.anisotropyB, lightDir );
		float dotBV = dot( material.anisotropyB, viewDir );
		float dotBH = dot( material.anisotropyB, halfDir );
		float V = V_GGX_SmithCorrelated_Anisotropic( material.alphaT, alpha, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL );
		float D = D_GGX_Anisotropic( material.alphaT, alpha, dotNH, dotTH, dotBH );
	#else
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
	#endif
	return F * ( V * D );
}
vec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {
	const float LUT_SIZE = 64.0;
	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
	const float LUT_BIAS = 0.5 / LUT_SIZE;
	float dotNV = saturate( dot( N, V ) );
	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );
	uv = uv * LUT_SCALE + LUT_BIAS;
	return uv;
}
float LTC_ClippedSphereFormFactor( const in vec3 f ) {
	float l = length( f );
	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );
}
vec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {
	float x = dot( v1, v2 );
	float y = abs( x );
	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;
	float b = 3.4175940 + ( 4.1616724 + y ) * y;
	float v = a / b;
	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;
	return cross( v1, v2 ) * theta_sintheta;
}
vec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {
	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
	vec3 lightNormal = cross( v1, v2 );
	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );
	vec3 T1, T2;
	T1 = normalize( V - N * dot( V, N ) );
	T2 = - cross( N, T1 );
	mat3 mat = mInv * transpose( mat3( T1, T2, N ) );
	vec3 coords[ 4 ];
	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );
	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );
	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );
	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );
	coords[ 0 ] = normalize( coords[ 0 ] );
	coords[ 1 ] = normalize( coords[ 1 ] );
	coords[ 2 ] = normalize( coords[ 2 ] );
	coords[ 3 ] = normalize( coords[ 3 ] );
	vec3 vectorFormFactor = vec3( 0.0 );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );
	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );
	return vec3( result );
}
#if defined( USE_SHEEN )
float D_Charlie( float roughness, float dotNH ) {
	float alpha = pow2( roughness );
	float invAlpha = 1.0 / alpha;
	float cos2h = dotNH * dotNH;
	float sin2h = max( 1.0 - cos2h, 0.0078125 );
	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );
}
float V_Neubelt( float dotNV, float dotNL ) {
	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );
}
vec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float D = D_Charlie( sheenRoughness, dotNH );
	float V = V_Neubelt( dotNV, dotNL );
	return sheenColor * ( D * V );
}
#endif
float IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	float r2 = roughness * roughness;
	float rInv = 1.0 / ( roughness + 0.1 );
	float a = -1.9362 + 1.0678 * roughness + 0.4573 * r2 - 0.8469 * rInv;
	float b = -0.6014 + 0.5538 * roughness - 0.4670 * r2 - 0.1255 * rInv;
	float DG = exp( a * dotNV + b );
	return saturate( DG );
}
vec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 fab = texture2D( dfgLUT, vec2( roughness, dotNV ) ).rg;
	return specularColor * fab.x + specularF90 * fab.y;
}
#ifdef USE_IRIDESCENCE
void computeMultiscatteringIridescence( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#else
void computeMultiscattering( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#endif
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 fab = texture2D( dfgLUT, vec2( roughness, dotNV ) ).rg;
	#ifdef USE_IRIDESCENCE
		vec3 Fr = mix( specularColor, iridescenceF0, iridescence );
	#else
		vec3 Fr = specularColor;
	#endif
	vec3 FssEss = Fr * fab.x + specularF90 * fab.y;
	float Ess = fab.x + fab.y;
	float Ems = 1.0 - Ess;
	vec3 Favg = Fr + ( 1.0 - Fr ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
	singleScatter += FssEss;
	multiScatter += Fms * Ems;
}
vec3 BRDF_GGX_Multiscatter( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 singleScatter = BRDF_GGX( lightDir, viewDir, normal, material );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 dfgV = texture2D( dfgLUT, vec2( material.roughness, dotNV ) ).rg;
	vec2 dfgL = texture2D( dfgLUT, vec2( material.roughness, dotNL ) ).rg;
	vec3 FssEss_V = material.specularColorBlended * dfgV.x + material.specularF90 * dfgV.y;
	vec3 FssEss_L = material.specularColorBlended * dfgL.x + material.specularF90 * dfgL.y;
	float Ess_V = dfgV.x + dfgV.y;
	float Ess_L = dfgL.x + dfgL.y;
	float Ems_V = 1.0 - Ess_V;
	float Ems_L = 1.0 - Ess_L;
	vec3 Favg = material.specularColorBlended + ( 1.0 - material.specularColorBlended ) * 0.047619;
	vec3 Fms = FssEss_V * FssEss_L * Favg / ( 1.0 - Ems_V * Ems_L * Favg + EPSILON );
	float compensationFactor = Ems_V * Ems_L;
	vec3 multiScatter = Fms * compensationFactor;
	return singleScatter + multiScatter;
}
#if NUM_RECT_AREA_LIGHTS > 0
	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
		vec3 normal = geometryNormal;
		vec3 viewDir = geometryViewDir;
		vec3 position = geometryPosition;
		vec3 lightPos = rectAreaLight.position;
		vec3 halfWidth = rectAreaLight.halfWidth;
		vec3 halfHeight = rectAreaLight.halfHeight;
		vec3 lightColor = rectAreaLight.color;
		float roughness = material.roughness;
		vec3 rectCoords[ 4 ];
		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;
		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;
		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;
		vec2 uv = LTC_Uv( normal, viewDir, roughness );
		vec4 t1 = texture2D( ltc_1, uv );
		vec4 t2 = texture2D( ltc_2, uv );
		mat3 mInv = mat3(
			vec3( t1.x, 0, t1.y ),
			vec3(    0, 1,    0 ),
			vec3( t1.z, 0, t1.w )
		);
		vec3 fresnel = ( material.specularColorBlended * t2.x + ( material.specularF90 - material.specularColorBlended ) * t2.y );
		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );
		reflectedLight.directDiffuse += lightColor * material.diffuseContribution * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );
		#ifdef USE_CLEARCOAT
			vec3 Ncc = geometryClearcoatNormal;
			vec2 uvClearcoat = LTC_Uv( Ncc, viewDir, material.clearcoatRoughness );
			vec4 t1Clearcoat = texture2D( ltc_1, uvClearcoat );
			vec4 t2Clearcoat = texture2D( ltc_2, uvClearcoat );
			mat3 mInvClearcoat = mat3(
				vec3( t1Clearcoat.x, 0, t1Clearcoat.y ),
				vec3(             0, 1,             0 ),
				vec3( t1Clearcoat.z, 0, t1Clearcoat.w )
			);
			vec3 fresnelClearcoat = material.clearcoatF0 * t2Clearcoat.x + ( material.clearcoatF90 - material.clearcoatF0 ) * t2Clearcoat.y;
			clearcoatSpecularDirect += lightColor * fresnelClearcoat * LTC_Evaluate( Ncc, viewDir, position, mInvClearcoat, rectCoords );
		#endif
	}
#endif
void RE_Direct_Physical( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	#ifdef USE_CLEARCOAT
		float dotNLcc = saturate( dot( geometryClearcoatNormal, directLight.direction ) );
		vec3 ccIrradiance = dotNLcc * directLight.color;
		clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material );
	#endif
	#ifdef USE_SHEEN
 
 		sheenSpecularDirect += irradiance * BRDF_Sheen( directLight.direction, geometryViewDir, geometryNormal, material.sheenColor, material.sheenRoughness );
 
 		float sheenAlbedoV = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
 		float sheenAlbedoL = IBLSheenBRDF( geometryNormal, directLight.direction, material.sheenRoughness );
 
 		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * max( sheenAlbedoV, sheenAlbedoL );
 
 		irradiance *= sheenEnergyComp;
 
 	#endif
	reflectedLight.directSpecular += irradiance * BRDF_GGX_Multiscatter( directLight.direction, geometryViewDir, geometryNormal, material );
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseContribution );
}
void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 diffuse = irradiance * BRDF_Lambert( material.diffuseContribution );
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		diffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectDiffuse += diffuse;
}
void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
	#ifdef USE_CLEARCOAT
		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness ) * RECIPROCAL_PI;
 	#endif
	vec3 singleScatteringDielectric = vec3( 0.0 );
	vec3 multiScatteringDielectric = vec3( 0.0 );
	vec3 singleScatteringMetallic = vec3( 0.0 );
	vec3 multiScatteringMetallic = vec3( 0.0 );
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.iridescence, material.iridescenceFresnelDielectric, material.roughness, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscatteringIridescence( geometryNormal, geometryViewDir, material.diffuseColor, material.specularF90, material.iridescence, material.iridescenceFresnelMetallic, material.roughness, singleScatteringMetallic, multiScatteringMetallic );
	#else
		computeMultiscattering( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.roughness, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscattering( geometryNormal, geometryViewDir, material.diffuseColor, material.specularF90, material.roughness, singleScatteringMetallic, multiScatteringMetallic );
	#endif
	vec3 singleScattering = mix( singleScatteringDielectric, singleScatteringMetallic, material.metalness );
	vec3 multiScattering = mix( multiScatteringDielectric, multiScatteringMetallic, material.metalness );
	vec3 totalScatteringDielectric = singleScatteringDielectric + multiScatteringDielectric;
	vec3 diffuse = material.diffuseContribution * ( 1.0 - totalScatteringDielectric );
	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;
	vec3 indirectSpecular = radiance * singleScattering;
	indirectSpecular += multiScattering * cosineWeightedIrradiance;
	vec3 indirectDiffuse = diffuse * cosineWeightedIrradiance;
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		indirectSpecular *= sheenEnergyComp;
		indirectDiffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectSpecular += indirectSpecular;
	reflectedLight.indirectDiffuse += indirectDiffuse;
}
#define RE_Direct				RE_Direct_Physical
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical
float computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {
	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );
}`,el=`
vec3 geometryPosition = - vViewPosition;
vec3 geometryNormal = normal;
vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
vec3 geometryClearcoatNormal = vec3( 0.0 );
#ifdef USE_CLEARCOAT
	geometryClearcoatNormal = clearcoatNormal;
#endif
#ifdef USE_IRIDESCENCE
	float dotNVi = saturate( dot( normal, geometryViewDir ) );
	if ( material.iridescenceThickness == 0.0 ) {
		material.iridescence = 0.0;
	} else {
		material.iridescence = saturate( material.iridescence );
	}
	if ( material.iridescence > 0.0 ) {
		material.iridescenceFresnelDielectric = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );
		material.iridescenceFresnelMetallic = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.diffuseColor );
		material.iridescenceFresnel = mix( material.iridescenceFresnelDielectric, material.iridescenceFresnelMetallic, material.metalness );
		material.iridescenceF0 = Schlick_to_F0( material.iridescenceFresnel, 1.0, dotNVi );
	}
#endif
IncidentLight directLight;
#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
	PointLight pointLight;
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		pointLight = pointLights[ i ];
		getPointLightInfo( pointLight, geometryPosition, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS ) && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
		pointLightShadow = pointLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowIntensity, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
	SpotLight spotLight;
	vec4 spotColor;
	vec3 spotLightCoord;
	bool inSpotLightMap;
	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		spotLight = spotLights[ i ];
		getSpotLightInfo( spotLight, geometryPosition, directLight );
		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX
		#elif ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		#define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS
		#else
		#define SPOT_LIGHT_MAP_INDEX ( UNROLLED_LOOP_INDEX - NUM_SPOT_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#endif
		#if ( SPOT_LIGHT_MAP_INDEX < NUM_SPOT_LIGHT_MAPS )
			spotLightCoord = vSpotLightCoord[ i ].xyz / vSpotLightCoord[ i ].w;
			inSpotLightMap = all( lessThan( abs( spotLightCoord * 2. - 1. ), vec3( 1.0 ) ) );
			spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy );
			directLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color;
		#endif
		#undef SPOT_LIGHT_MAP_INDEX
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		spotLightShadow = spotLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowIntensity, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
	RectAreaLight rectAreaLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
		rectAreaLight = rectAreaLights[ i ];
		RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if defined( RE_IndirectDiffuse )
	vec3 iblIrradiance = vec3( 0.0 );
	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
	#if defined( USE_LIGHT_PROBES )
		irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );
	#endif
	#if ( NUM_HEMI_LIGHTS > 0 )
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );
		}
		#pragma unroll_loop_end
	#endif
#endif
#if defined( RE_IndirectSpecular )
	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );
#endif`,tl=`#if defined( RE_IndirectDiffuse )
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
		irradiance += lightMapIrradiance;
	#endif
	#if defined( USE_ENVMAP ) && defined( ENVMAP_TYPE_CUBE_UV )
		#if defined( STANDARD ) || defined( LAMBERT ) || defined( PHONG )
			iblIrradiance += getIBLIrradiance( geometryNormal );
		#endif
	#endif
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	#ifdef USE_ANISOTROPY
		radiance += getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
	#else
		radiance += getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );
	#endif
	#ifdef USE_CLEARCOAT
		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );
	#endif
#endif`,nl=`#if defined( RE_IndirectDiffuse )
	#if defined( LAMBERT ) || defined( PHONG )
		irradiance += iblIrradiance;
	#endif
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,il=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,al=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,rl=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,ol=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,sl=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,ll=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,cl=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	#if defined( USE_POINTS_UV )
		vec2 uv = vUv;
	#else
		vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;
	#endif
#endif
#ifdef USE_MAP
	diffuseColor *= texture2D( map, uv );
#endif
#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, uv ).g;
#endif`,fl=`#if defined( USE_POINTS_UV )
	varying vec2 vUv;
#else
	#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
		uniform mat3 uvTransform;
	#endif
#endif
#ifdef USE_MAP
	uniform sampler2D map;
#endif
#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,dl=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,ul=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,pl=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,hl=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,ml=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,_l=`#ifdef USE_MORPHTARGETS
	#ifndef USE_INSTANCING_MORPH
		uniform float morphTargetBaseInfluence;
		uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	#endif
	uniform sampler2DArray morphTargetsTexture;
	uniform ivec2 morphTargetsTextureSize;
	vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) {
		int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;
		int y = texelIndex / morphTargetsTextureSize.x;
		int x = texelIndex - y * morphTargetsTextureSize.x;
		ivec3 morphUV = ivec3( x, y, morphTargetIndex );
		return texelFetch( morphTargetsTexture, morphUV, 0 );
	}
#endif`,gl=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,vl=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
#ifdef FLAT_SHADED
	vec3 fdx = dFdx( vViewPosition );
	vec3 fdy = dFdy( vViewPosition );
	vec3 normal = normalize( cross( fdx, fdy ) );
#else
	vec3 normal = normalize( vNormal );
	#ifdef DOUBLE_SIDED
		normal *= faceDirection;
	#endif
#endif
#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY )
	#ifdef USE_TANGENT
		mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn = getTangentFrame( - vViewPosition, normal,
		#if defined( USE_NORMALMAP )
			vNormalMapUv
		#elif defined( USE_CLEARCOAT_NORMALMAP )
			vClearcoatNormalMapUv
		#else
			vUv
		#endif
		);
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn[0] *= faceDirection;
		tbn[1] *= faceDirection;
	#endif
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	#ifdef USE_TANGENT
		mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );
	#endif
	#if defined( DOUBLE_SIDED ) && ! defined( FLAT_SHADED )
		tbn2[0] *= faceDirection;
		tbn2[1] *= faceDirection;
	#endif
#endif
vec3 nonPerturbedNormal = normal;`,Sl=`#ifdef USE_NORMALMAP_OBJECTSPACE
	normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#ifdef FLIP_SIDED
		normal = - normal;
	#endif
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	normal = normalize( normalMatrix * normal );
#elif defined( USE_NORMALMAP_TANGENTSPACE )
	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	mapN.xy *= normalScale;
	normal = normalize( tbn * mapN );
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif`,El=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,xl=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,Ml=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
	#endif
#endif`,Tl=`#ifdef USE_NORMALMAP
	uniform sampler2D normalMap;
	uniform vec2 normalScale;
#endif
#ifdef USE_NORMALMAP_OBJECTSPACE
	uniform mat3 normalMatrix;
#endif
#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) )
	mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {
		vec3 q0 = dFdx( eye_pos.xyz );
		vec3 q1 = dFdy( eye_pos.xyz );
		vec2 st0 = dFdx( uv.st );
		vec2 st1 = dFdy( uv.st );
		vec3 N = surf_norm;
		vec3 q1perp = cross( q1, N );
		vec3 q0perp = cross( N, q0 );
		vec3 T = q1perp * st0.x + q0perp * st1.x;
		vec3 B = q1perp * st0.y + q0perp * st1.y;
		float det = max( dot( T, T ), dot( B, B ) );
		float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );
		return mat3( T * scale, B * scale, N );
	}
#endif`,Al=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,Rl=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,bl=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,Cl=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,Pl=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,Dl=`vec3 packNormalToRGB( const in vec3 normal ) {
	return normalize( normal ) * 0.5 + 0.5;
}
vec3 unpackRGBToNormal( const in vec3 rgb ) {
	return 2.0 * rgb.xyz - 1.0;
}
const float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;const float ShiftRight8 = 1. / 256.;
const float Inv255 = 1. / 255.;
const vec4 PackFactors = vec4( 1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0 );
const vec2 UnpackFactors2 = vec2( UnpackDownscale, 1.0 / PackFactors.g );
const vec3 UnpackFactors3 = vec3( UnpackDownscale / PackFactors.rg, 1.0 / PackFactors.b );
const vec4 UnpackFactors4 = vec4( UnpackDownscale / PackFactors.rgb, 1.0 / PackFactors.a );
vec4 packDepthToRGBA( const in float v ) {
	if( v <= 0.0 )
		return vec4( 0., 0., 0., 0. );
	if( v >= 1.0 )
		return vec4( 1., 1., 1., 1. );
	float vuf;
	float af = modf( v * PackFactors.a, vuf );
	float bf = modf( vuf * ShiftRight8, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec4( vuf * Inv255, gf * PackUpscale, bf * PackUpscale, af );
}
vec3 packDepthToRGB( const in float v ) {
	if( v <= 0.0 )
		return vec3( 0., 0., 0. );
	if( v >= 1.0 )
		return vec3( 1., 1., 1. );
	float vuf;
	float bf = modf( v * PackFactors.b, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec3( vuf * Inv255, gf * PackUpscale, bf );
}
vec2 packDepthToRG( const in float v ) {
	if( v <= 0.0 )
		return vec2( 0., 0. );
	if( v >= 1.0 )
		return vec2( 1., 1. );
	float vuf;
	float gf = modf( v * 256., vuf );
	return vec2( vuf * Inv255, gf );
}
float unpackRGBAToDepth( const in vec4 v ) {
	return dot( v, UnpackFactors4 );
}
float unpackRGBToDepth( const in vec3 v ) {
	return dot( v, UnpackFactors3 );
}
float unpackRGToDepth( const in vec2 v ) {
	return v.r * UnpackFactors2.r + v.g * UnpackFactors2.g;
}
vec4 pack2HalfToRGBA( const in vec2 v ) {
	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );
	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );
}
vec2 unpackRGBATo2Half( const in vec4 v ) {
	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}
float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
	return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float depth, const in float near, const in float far ) {
	#ifdef USE_REVERSED_DEPTH_BUFFER
	
		return depth * ( far - near ) - far;
	#else
		return depth * ( near - far ) - near;
	#endif
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {
	
	#ifdef USE_REVERSED_DEPTH_BUFFER
		return ( near * far ) / ( ( near - far ) * depth - near );
	#else
		return ( near * far ) / ( ( far - near ) * depth - far );
	#endif
}`,Ll=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,wl=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,Ul=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,Il=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,yl=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,Nl=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,Fl=`#if NUM_SPOT_LIGHT_COORDS > 0
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#if NUM_SPOT_LIGHT_MAPS > 0
	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#else
			uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#endif
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#else
			uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#endif
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform samplerCubeShadow pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#elif defined( SHADOWMAP_TYPE_BASIC )
			uniform samplerCube pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#endif
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float interleavedGradientNoise( vec2 position ) {
			return fract( 52.9829189 * fract( dot( position, vec2( 0.06711056, 0.00583715 ) ) ) );
		}
		vec2 vogelDiskSample( int sampleIndex, int samplesCount, float phi ) {
			const float goldenAngle = 2.399963229728653;
			float r = sqrt( ( float( sampleIndex ) + 0.5 ) / float( samplesCount ) );
			float theta = float( sampleIndex ) * goldenAngle + phi;
			return vec2( cos( theta ), sin( theta ) ) * r;
		}
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float getShadow( sampler2DShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			shadowCoord.z += shadowBias;
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
				float radius = shadowRadius * texelSize.x;
				float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
				shadow = (
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 0, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 1, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 2, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 3, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 4, 5, phi ) * radius, shadowCoord.z ) )
				) * 0.2;
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#elif defined( SHADOWMAP_TYPE_VSM )
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 distribution = texture2D( shadowMap, shadowCoord.xy ).rg;
				float mean = distribution.x;
				float variance = distribution.y * distribution.y;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					float hard_shadow = step( mean, shadowCoord.z );
				#else
					float hard_shadow = step( shadowCoord.z, mean );
				#endif
				
				if ( hard_shadow == 1.0 ) {
					shadow = 1.0;
				} else {
					variance = max( variance, 0.0000001 );
					float d = shadowCoord.z - mean;
					float p_max = variance / ( variance + d * d );
					p_max = clamp( ( p_max - 0.3 ) / 0.65, 0.0, 1.0 );
					shadow = max( hard_shadow, p_max );
				}
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#else
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				float depth = texture2D( shadowMap, shadowCoord.xy ).r;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					shadow = step( depth, shadowCoord.z );
				#else
					shadow = step( shadowCoord.z, depth );
				#endif
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	#if defined( SHADOWMAP_TYPE_PCF )
	float getPointShadow( samplerCubeShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 bd3D = normalize( lightToPosition );
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			#ifdef USE_REVERSED_DEPTH_BUFFER
				float dp = ( shadowCameraNear * ( shadowCameraFar - viewSpaceZ ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
				dp -= shadowBias;
			#else
				float dp = ( shadowCameraFar * ( viewSpaceZ - shadowCameraNear ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
				dp += shadowBias;
			#endif
			float texelSize = shadowRadius / shadowMapSize.x;
			vec3 absDir = abs( bd3D );
			vec3 tangent = absDir.x > absDir.z ? vec3( 0.0, 1.0, 0.0 ) : vec3( 1.0, 0.0, 0.0 );
			tangent = normalize( cross( bd3D, tangent ) );
			vec3 bitangent = cross( bd3D, tangent );
			float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
			vec2 sample0 = vogelDiskSample( 0, 5, phi );
			vec2 sample1 = vogelDiskSample( 1, 5, phi );
			vec2 sample2 = vogelDiskSample( 2, 5, phi );
			vec2 sample3 = vogelDiskSample( 3, 5, phi );
			vec2 sample4 = vogelDiskSample( 4, 5, phi );
			shadow = (
				texture( shadowMap, vec4( bd3D + ( tangent * sample0.x + bitangent * sample0.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample1.x + bitangent * sample1.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample2.x + bitangent * sample2.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample3.x + bitangent * sample3.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample4.x + bitangent * sample4.y ) * texelSize, dp ) )
			) * 0.2;
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#elif defined( SHADOWMAP_TYPE_BASIC )
	float getPointShadow( samplerCube shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			float dp = ( shadowCameraFar * ( viewSpaceZ - shadowCameraNear ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
			dp += shadowBias;
			vec3 bd3D = normalize( lightToPosition );
			float depth = textureCube( shadowMap, bd3D ).r;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				depth = 1.0 - depth;
			#endif
			shadow = step( dp, depth );
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#endif
	#endif
#endif`,Ol=`#if NUM_SPOT_LIGHT_COORDS > 0
	uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ];
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
#endif`,Bl=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
	vec3 shadowWorldNormal = inverseTransformDirection( transformedNormal, viewMatrix );
	vec4 shadowWorldPosition;
#endif
#if defined( USE_SHADOWMAP )
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );
			vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );
			vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
#endif
#if NUM_SPOT_LIGHT_COORDS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_COORDS; i ++ ) {
		shadowWorldPosition = worldPosition;
		#if ( defined( USE_SHADOWMAP ) && UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
			shadowWorldPosition.xyz += shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias;
		#endif
		vSpotLightCoord[ i ] = spotLightMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
#endif`,Gl=`float getShadowMask() {
	float shadow = 1.0;
	#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		directionalLight = directionalLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowIntensity, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		spotLight = spotLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowIntensity, spotLight.shadowBias, spotLight.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0 && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
	PointLightShadow pointLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		pointLight = pointLightShadows[ i ];
		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowIntensity, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#endif
	return shadow;
}`,Hl=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,Vl=`#ifdef USE_SKINNING
	uniform mat4 bindMatrix;
	uniform mat4 bindMatrixInverse;
	uniform highp sampler2D boneTexture;
	mat4 getBoneMatrix( const in float i ) {
		int size = textureSize( boneTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,kl=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,Wl=`#ifdef USE_SKINNING
	mat4 skinMatrix = mat4( 0.0 );
	skinMatrix += skinWeight.x * boneMatX;
	skinMatrix += skinWeight.y * boneMatY;
	skinMatrix += skinWeight.z * boneMatZ;
	skinMatrix += skinWeight.w * boneMatW;
	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;
	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;
	#ifdef USE_TANGENT
		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#endif
#endif`,zl=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,Xl=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,Yl=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,Kl=`#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
uniform float toneMappingExposure;
vec3 LinearToneMapping( vec3 color ) {
	return saturate( toneMappingExposure * color );
}
vec3 ReinhardToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	return saturate( color / ( vec3( 1.0 ) + color ) );
}
vec3 CineonToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	color = max( vec3( 0.0 ), color - 0.004 );
	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}
vec3 RRTAndODTFit( vec3 v ) {
	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
	return a / b;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
	const mat3 ACESInputMat = mat3(
		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),
		vec3( 0.04823, 0.01566, 0.83777 )
	);
	const mat3 ACESOutputMat = mat3(
		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),
		vec3( -0.07367, -0.00605,  1.07602 )
	);
	color *= toneMappingExposure / 0.6;
	color = ACESInputMat * color;
	color = RRTAndODTFit( color );
	color = ACESOutputMat * color;
	return saturate( color );
}
const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
	vec3( 1.6605, - 0.1246, - 0.0182 ),
	vec3( - 0.5876, 1.1329, - 0.1006 ),
	vec3( - 0.0728, - 0.0083, 1.1187 )
);
const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
	vec3( 0.6274, 0.0691, 0.0164 ),
	vec3( 0.3293, 0.9195, 0.0880 ),
	vec3( 0.0433, 0.0113, 0.8956 )
);
vec3 agxDefaultContrastApprox( vec3 x ) {
	vec3 x2 = x * x;
	vec3 x4 = x2 * x2;
	return + 15.5 * x4 * x2
		- 40.14 * x4 * x
		+ 31.96 * x4
		- 6.868 * x2 * x
		+ 0.4298 * x2
		+ 0.1191 * x
		- 0.00232;
}
vec3 AgXToneMapping( vec3 color ) {
	const mat3 AgXInsetMatrix = mat3(
		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )
	);
	const mat3 AgXOutsetMatrix = mat3(
		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),
		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),
		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )
	);
	const float AgxMinEv = - 12.47393;	const float AgxMaxEv = 4.026069;
	color *= toneMappingExposure;
	color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
	color = AgXInsetMatrix * color;
	color = max( color, 1e-10 );	color = log2( color );
	color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );
	color = clamp( color, 0.0, 1.0 );
	color = agxDefaultContrastApprox( color );
	color = AgXOutsetMatrix * color;
	color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
	color = LINEAR_REC2020_TO_LINEAR_SRGB * color;
	color = clamp( color, 0.0, 1.0 );
	return color;
}
vec3 NeutralToneMapping( vec3 color ) {
	const float StartCompression = 0.8 - 0.04;
	const float Desaturation = 0.15;
	color *= toneMappingExposure;
	float x = min( color.r, min( color.g, color.b ) );
	float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
	color -= offset;
	float peak = max( color.r, max( color.g, color.b ) );
	if ( peak < StartCompression ) return color;
	float d = 1. - StartCompression;
	float newPeak = 1. - d * d / ( peak + d - StartCompression );
	color *= newPeak / peak;
	float g = 1. - 1. / ( Desaturation * ( peak - newPeak ) + 1. );
	return mix( color, vec3( newPeak ), g );
}
vec3 CustomToneMapping( vec3 color ) { return color; }`,ql=`#ifdef USE_TRANSMISSION
	material.transmission = transmission;
	material.transmissionAlpha = 1.0;
	material.thickness = thickness;
	material.attenuationDistance = attenuationDistance;
	material.attenuationColor = attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;
	#endif
	#ifdef USE_THICKNESSMAP
		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;
	#endif
	vec3 pos = vWorldPosition;
	vec3 v = normalize( cameraPosition - pos );
	vec3 n = inverseTransformDirection( normal, viewMatrix );
	vec4 transmitted = getIBLVolumeRefraction(
		n, v, material.roughness, material.diffuseContribution, material.specularColorBlended, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, material.dispersion, material.ior, material.thickness,
		material.attenuationColor, material.attenuationDistance );
	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );
	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );
#endif`,Zl=`#ifdef USE_TRANSMISSION
	uniform float transmission;
	uniform float thickness;
	uniform float attenuationDistance;
	uniform vec3 attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		uniform sampler2D transmissionMap;
	#endif
	#ifdef USE_THICKNESSMAP
		uniform sampler2D thicknessMap;
	#endif
	uniform vec2 transmissionSamplerSize;
	uniform sampler2D transmissionSamplerMap;
	uniform mat4 modelMatrix;
	uniform mat4 projectionMatrix;
	varying vec3 vWorldPosition;
	float w0( float a ) {
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - a + 3.0 ) - 3.0 ) + 1.0 );
	}
	float w1( float a ) {
		return ( 1.0 / 6.0 ) * ( a *  a * ( 3.0 * a - 6.0 ) + 4.0 );
	}
	float w2( float a ){
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - 3.0 * a + 3.0 ) + 3.0 ) + 1.0 );
	}
	float w3( float a ) {
		return ( 1.0 / 6.0 ) * ( a * a * a );
	}
	float g0( float a ) {
		return w0( a ) + w1( a );
	}
	float g1( float a ) {
		return w2( a ) + w3( a );
	}
	float h0( float a ) {
		return - 1.0 + w1( a ) / ( w0( a ) + w1( a ) );
	}
	float h1( float a ) {
		return 1.0 + w3( a ) / ( w2( a ) + w3( a ) );
	}
	vec4 bicubic( sampler2D tex, vec2 uv, vec4 texelSize, float lod ) {
		uv = uv * texelSize.zw + 0.5;
		vec2 iuv = floor( uv );
		vec2 fuv = fract( uv );
		float g0x = g0( fuv.x );
		float g1x = g1( fuv.x );
		float h0x = h0( fuv.x );
		float h1x = h1( fuv.x );
		float h0y = h0( fuv.y );
		float h1y = h1( fuv.y );
		vec2 p0 = ( vec2( iuv.x + h0x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p1 = ( vec2( iuv.x + h1x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p2 = ( vec2( iuv.x + h0x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		vec2 p3 = ( vec2( iuv.x + h1x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		return g0( fuv.y ) * ( g0x * textureLod( tex, p0, lod ) + g1x * textureLod( tex, p1, lod ) ) +
			g1( fuv.y ) * ( g0x * textureLod( tex, p2, lod ) + g1x * textureLod( tex, p3, lod ) );
	}
	vec4 textureBicubic( sampler2D sampler, vec2 uv, float lod ) {
		vec2 fLodSize = vec2( textureSize( sampler, int( lod ) ) );
		vec2 cLodSize = vec2( textureSize( sampler, int( lod + 1.0 ) ) );
		vec2 fLodSizeInv = 1.0 / fLodSize;
		vec2 cLodSizeInv = 1.0 / cLodSize;
		vec4 fSample = bicubic( sampler, uv, vec4( fLodSizeInv, fLodSize ), floor( lod ) );
		vec4 cSample = bicubic( sampler, uv, vec4( cLodSizeInv, cLodSize ), ceil( lod ) );
		return mix( fSample, cSample, fract( lod ) );
	}
	vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
		vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );
		vec3 modelScale;
		modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
		modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
		modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );
		return normalize( refractionVector ) * thickness * modelScale;
	}
	float applyIorToRoughness( const in float roughness, const in float ior ) {
		return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
	}
	vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
		float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );
		return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );
	}
	vec3 volumeAttenuation( const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {
		if ( isinf( attenuationDistance ) ) {
			return vec3( 1.0 );
		} else {
			vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;
			vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );			return transmittance;
		}
	}
	vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
		const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,
		const in mat4 viewMatrix, const in mat4 projMatrix, const in float dispersion, const in float ior, const in float thickness,
		const in vec3 attenuationColor, const in float attenuationDistance ) {
		vec4 transmittedLight;
		vec3 transmittance;
		#ifdef USE_DISPERSION
			float halfSpread = ( ior - 1.0 ) * 0.025 * dispersion;
			vec3 iors = vec3( ior - halfSpread, ior, ior + halfSpread );
			for ( int i = 0; i < 3; i ++ ) {
				vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, iors[ i ], modelMatrix );
				vec3 refractedRayExit = position + transmissionRay;
				vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
				vec2 refractionCoords = ndcPos.xy / ndcPos.w;
				refractionCoords += 1.0;
				refractionCoords /= 2.0;
				vec4 transmissionSample = getTransmissionSample( refractionCoords, roughness, iors[ i ] );
				transmittedLight[ i ] = transmissionSample[ i ];
				transmittedLight.a += transmissionSample.a;
				transmittance[ i ] = diffuseColor[ i ] * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance )[ i ];
			}
			transmittedLight.a /= 3.0;
		#else
			vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
			vec3 refractedRayExit = position + transmissionRay;
			vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
			vec2 refractionCoords = ndcPos.xy / ndcPos.w;
			refractionCoords += 1.0;
			refractionCoords /= 2.0;
			transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );
			transmittance = diffuseColor * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance );
		#endif
		vec3 attenuatedColor = transmittance * transmittedLight.rgb;
		vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );
		float transmittanceFactor = ( transmittance.r + transmittance.g + transmittance.b ) / 3.0;
		return vec4( ( 1.0 - F ) * attenuatedColor, 1.0 - ( 1.0 - transmittedLight.a ) * transmittanceFactor );
	}
#endif`,$l=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_SPECULARMAP
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,jl=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	uniform mat3 mapTransform;
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	uniform mat3 alphaMapTransform;
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	uniform mat3 lightMapTransform;
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	uniform mat3 aoMapTransform;
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	uniform mat3 bumpMapTransform;
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	uniform mat3 normalMapTransform;
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_DISPLACEMENTMAP
	uniform mat3 displacementMapTransform;
	varying vec2 vDisplacementMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	uniform mat3 emissiveMapTransform;
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	uniform mat3 metalnessMapTransform;
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	uniform mat3 roughnessMapTransform;
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	uniform mat3 anisotropyMapTransform;
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	uniform mat3 clearcoatMapTransform;
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform mat3 clearcoatNormalMapTransform;
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform mat3 clearcoatRoughnessMapTransform;
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	uniform mat3 sheenColorMapTransform;
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	uniform mat3 sheenRoughnessMapTransform;
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	uniform mat3 iridescenceMapTransform;
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform mat3 iridescenceThicknessMapTransform;
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SPECULARMAP
	uniform mat3 specularMapTransform;
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	uniform mat3 specularColorMapTransform;
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	uniform mat3 specularIntensityMapTransform;
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,Ql=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	vUv = vec3( uv, 1 ).xy;
#endif
#ifdef USE_MAP
	vMapUv = ( mapTransform * vec3( MAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ALPHAMAP
	vAlphaMapUv = ( alphaMapTransform * vec3( ALPHAMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_LIGHTMAP
	vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_AOMAP
	vAoMapUv = ( aoMapTransform * vec3( AOMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_BUMPMAP
	vBumpMapUv = ( bumpMapTransform * vec3( BUMPMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_NORMALMAP
	vNormalMapUv = ( normalMapTransform * vec3( NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DISPLACEMENTMAP
	vDisplacementMapUv = ( displacementMapTransform * vec3( DISPLACEMENTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_EMISSIVEMAP
	vEmissiveMapUv = ( emissiveMapTransform * vec3( EMISSIVEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_METALNESSMAP
	vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ROUGHNESSMAP
	vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ANISOTROPYMAP
	vAnisotropyMapUv = ( anisotropyMapTransform * vec3( ANISOTROPYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOATMAP
	vClearcoatMapUv = ( clearcoatMapTransform * vec3( CLEARCOATMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	vClearcoatNormalMapUv = ( clearcoatNormalMapTransform * vec3( CLEARCOAT_NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	vClearcoatRoughnessMapUv = ( clearcoatRoughnessMapTransform * vec3( CLEARCOAT_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCEMAP
	vIridescenceMapUv = ( iridescenceMapTransform * vec3( IRIDESCENCEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	vIridescenceThicknessMapUv = ( iridescenceThicknessMapTransform * vec3( IRIDESCENCE_THICKNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_COLORMAP
	vSheenColorMapUv = ( sheenColorMapTransform * vec3( SHEEN_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	vSheenRoughnessMapUv = ( sheenRoughnessMapTransform * vec3( SHEEN_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULARMAP
	vSpecularMapUv = ( specularMapTransform * vec3( SPECULARMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_COLORMAP
	vSpecularColorMapUv = ( specularColorMapTransform * vec3( SPECULAR_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	vSpecularIntensityMapUv = ( specularIntensityMapTransform * vec3( SPECULAR_INTENSITYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_TRANSMISSIONMAP
	vTransmissionMapUv = ( transmissionMapTransform * vec3( TRANSMISSIONMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_THICKNESSMAP
	vThicknessMapUv = ( thicknessMapTransform * vec3( THICKNESSMAP_UV, 1 ) ).xy;
#endif`,Jl=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`;const ec=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,tc=`uniform sampler2D t2D;
uniform float backgroundIntensity;
varying vec2 vUv;
void main() {
	vec4 texColor = texture2D( t2D, vUv );
	#ifdef DECODE_VIDEO_TEXTURE
		texColor = vec4( mix( pow( texColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), texColor.rgb * 0.0773993808, vec3( lessThanEqual( texColor.rgb, vec3( 0.04045 ) ) ) ), texColor.w );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,nc=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,ic=`#ifdef ENVMAP_TYPE_CUBE
	uniform samplerCube envMap;
#elif defined( ENVMAP_TYPE_CUBE_UV )
	uniform sampler2D envMap;
#endif
uniform float flipEnvMap;
uniform float backgroundBlurriness;
uniform float backgroundIntensity;
uniform mat3 backgroundRotation;
varying vec3 vWorldDirection;
#include <cube_uv_reflection_fragment>
void main() {
	#ifdef ENVMAP_TYPE_CUBE
		vec4 texColor = textureCube( envMap, backgroundRotation * vec3( flipEnvMap * vWorldDirection.x, vWorldDirection.yz ) );
	#elif defined( ENVMAP_TYPE_CUBE_UV )
		vec4 texColor = textureCubeUV( envMap, backgroundRotation * vWorldDirection, backgroundBlurriness );
	#else
		vec4 texColor = vec4( 0.0, 0.0, 0.0, 1.0 );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,ac=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,rc=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,oc=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec2 vHighPrecisionZW;
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vHighPrecisionZW = gl_Position.zw;
}`,sc=`#if DEPTH_PACKING == 3200
	uniform float opacity;
#endif
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
varying vec2 vHighPrecisionZW;
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#if DEPTH_PACKING == 3200
		diffuseColor.a = opacity;
	#endif
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <logdepthbuf_fragment>
	#ifdef USE_REVERSED_DEPTH_BUFFER
		float fragCoordZ = vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ];
	#else
		float fragCoordZ = 0.5 * vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ] + 0.5;
	#endif
	#if DEPTH_PACKING == 3200
		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );
	#elif DEPTH_PACKING == 3201
		gl_FragColor = packDepthToRGBA( fragCoordZ );
	#elif DEPTH_PACKING == 3202
		gl_FragColor = vec4( packDepthToRGB( fragCoordZ ), 1.0 );
	#elif DEPTH_PACKING == 3203
		gl_FragColor = vec4( packDepthToRG( fragCoordZ ), 0.0, 1.0 );
	#endif
}`,lc=`#define DISTANCE
varying vec3 vWorldPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	vWorldPosition = worldPosition.xyz;
}`,cc=`#define DISTANCE
uniform vec3 referencePosition;
uniform float nearDistance;
uniform float farDistance;
varying vec3 vWorldPosition;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <clipping_planes_pars_fragment>
void main () {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	float dist = length( vWorldPosition - referencePosition );
	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );
	dist = saturate( dist );
	gl_FragColor = vec4( dist, 0.0, 0.0, 1.0 );
}`,fc=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,dc=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,uc=`uniform float scale;
attribute float lineDistance;
varying float vLineDistance;
#include <common>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	vLineDistance = scale * lineDistance;
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,pc=`uniform vec3 diffuse;
uniform float opacity;
uniform float dashSize;
uniform float totalSize;
varying float vLineDistance;
#include <common>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	if ( mod( vLineDistance, totalSize ) > dashSize ) {
		discard;
	}
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,hc=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinbase_vertex>
		#include <skinnormal_vertex>
		#include <defaultnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>
}`,mc=`uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
	#else
		reflectedLight.indirectDiffuse += vec3( 1.0 );
	#endif
	#include <aomap_fragment>
	reflectedLight.indirectDiffuse *= diffuseColor.rgb;
	vec3 outgoingLight = reflectedLight.indirectDiffuse;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,_c=`#define LAMBERT
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,gc=`#define LAMBERT
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_lambert_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_lambert_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,vc=`#define MATCAP
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <displacementmap_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
	vViewPosition = - mvPosition.xyz;
}`,Sc=`#define MATCAP
uniform vec3 diffuse;
uniform float opacity;
uniform sampler2D matcap;
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	vec3 viewDir = normalize( vViewPosition );
	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );
	vec3 y = cross( viewDir, x );
	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;
	#ifdef USE_MATCAP
		vec4 matcapColor = texture2D( matcap, uv );
	#else
		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 );
	#endif
	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Ec=`#define NORMAL
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	vViewPosition = - mvPosition.xyz;
#endif
}`,xc=`#define NORMAL
uniform float opacity;
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <uv_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 0.0, 0.0, 0.0, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	gl_FragColor = vec4( normalize( normal ) * 0.5 + 0.5, diffuseColor.a );
	#ifdef OPAQUE
		gl_FragColor.a = 1.0;
	#endif
}`,Mc=`#define PHONG
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Tc=`#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Ac=`#define STANDARD
varying vec3 vViewPosition;
#ifdef USE_TRANSMISSION
	varying vec3 vWorldPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
#ifdef USE_TRANSMISSION
	vWorldPosition = worldPosition.xyz;
#endif
}`,Rc=`#define STANDARD
#ifdef PHYSICAL
	#define IOR
	#define USE_SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef IOR
	uniform float ior;
#endif
#ifdef USE_SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULAR_COLORMAP
		uniform sampler2D specularColorMap;
	#endif
	#ifdef USE_SPECULAR_INTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_DISPERSION
	uniform float dispersion;
#endif
#ifdef USE_IRIDESCENCE
	uniform float iridescence;
	uniform float iridescenceIOR;
	uniform float iridescenceThicknessMinimum;
	uniform float iridescenceThicknessMaximum;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEEN_COLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEEN_ROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
#ifdef USE_ANISOTROPY
	uniform vec2 anisotropyVector;
	#ifdef USE_ANISOTROPYMAP
		uniform sampler2D anisotropyMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <iridescence_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	#ifdef USE_SHEEN
 
		outgoingLight = outgoingLight + sheenSpecularDirect + sheenSpecularIndirect;
 
 	#endif
	#ifdef USE_CLEARCOAT
		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );
		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;
	#endif
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,bc=`#define TOON
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,Cc=`#define TOON
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_toon_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_toon_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,Pc=`uniform float size;
uniform float scale;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
#ifdef USE_POINTS_UV
	varying vec2 vUv;
	uniform mat3 uvTransform;
#endif
void main() {
	#ifdef USE_POINTS_UV
		vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	#endif
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	gl_PointSize = size;
	#ifdef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
	#endif
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>
}`,Dc=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_particle_fragment>
	#include <color_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,Lc=`#include <common>
#include <batching_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <shadowmap_pars_vertex>
void main() {
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,wc=`uniform vec3 color;
uniform float opacity;
#include <common>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <logdepthbuf_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
void main() {
	#include <logdepthbuf_fragment>
	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,Uc=`uniform float rotation;
uniform vec2 center;
#include <common>
#include <uv_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	vec4 mvPosition = modelViewMatrix[ 3 ];
	vec2 scale = vec2( length( modelMatrix[ 0 ].xyz ), length( modelMatrix[ 1 ].xyz ) );
	#ifndef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) scale *= - mvPosition.z;
	#endif
	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;
	vec2 rotatedPosition;
	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
	mvPosition.xy += rotatedPosition;
	gl_Position = projectionMatrix * mvPosition;
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,Ic=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,Oe={alphahash_fragment:ts,alphahash_pars_fragment:ns,alphamap_fragment:is,alphamap_pars_fragment:as,alphatest_fragment:rs,alphatest_pars_fragment:os,aomap_fragment:ss,aomap_pars_fragment:ls,batching_pars_vertex:cs,batching_vertex:fs,begin_vertex:ds,beginnormal_vertex:us,bsdfs:ps,iridescence_fragment:hs,bumpmap_pars_fragment:ms,clipping_planes_fragment:_s,clipping_planes_pars_fragment:gs,clipping_planes_pars_vertex:vs,clipping_planes_vertex:Ss,color_fragment:Es,color_pars_fragment:xs,color_pars_vertex:Ms,color_vertex:Ts,common:As,cube_uv_reflection_fragment:Rs,defaultnormal_vertex:bs,displacementmap_pars_vertex:Cs,displacementmap_vertex:Ps,emissivemap_fragment:Ds,emissivemap_pars_fragment:Ls,colorspace_fragment:ws,colorspace_pars_fragment:Us,envmap_fragment:Is,envmap_common_pars_fragment:ys,envmap_pars_fragment:Ns,envmap_pars_vertex:Fs,envmap_physical_pars_fragment:Ks,envmap_vertex:Os,fog_vertex:Bs,fog_pars_vertex:Gs,fog_fragment:Hs,fog_pars_fragment:Vs,gradientmap_pars_fragment:ks,lightmap_pars_fragment:Ws,lights_lambert_fragment:zs,lights_lambert_pars_fragment:Xs,lights_pars_begin:Ys,lights_toon_fragment:qs,lights_toon_pars_fragment:Zs,lights_phong_fragment:$s,lights_phong_pars_fragment:js,lights_physical_fragment:Qs,lights_physical_pars_fragment:Js,lights_fragment_begin:el,lights_fragment_maps:tl,lights_fragment_end:nl,logdepthbuf_fragment:il,logdepthbuf_pars_fragment:al,logdepthbuf_pars_vertex:rl,logdepthbuf_vertex:ol,map_fragment:sl,map_pars_fragment:ll,map_particle_fragment:cl,map_particle_pars_fragment:fl,metalnessmap_fragment:dl,metalnessmap_pars_fragment:ul,morphinstance_vertex:pl,morphcolor_vertex:hl,morphnormal_vertex:ml,morphtarget_pars_vertex:_l,morphtarget_vertex:gl,normal_fragment_begin:vl,normal_fragment_maps:Sl,normal_pars_fragment:El,normal_pars_vertex:xl,normal_vertex:Ml,normalmap_pars_fragment:Tl,clearcoat_normal_fragment_begin:Al,clearcoat_normal_fragment_maps:Rl,clearcoat_pars_fragment:bl,iridescence_pars_fragment:Cl,opaque_fragment:Pl,packing:Dl,premultiplied_alpha_fragment:Ll,project_vertex:wl,dithering_fragment:Ul,dithering_pars_fragment:Il,roughnessmap_fragment:yl,roughnessmap_pars_fragment:Nl,shadowmap_pars_fragment:Fl,shadowmap_pars_vertex:Ol,shadowmap_vertex:Bl,shadowmask_pars_fragment:Gl,skinbase_vertex:Hl,skinning_pars_vertex:Vl,skinning_vertex:kl,skinnormal_vertex:Wl,specularmap_fragment:zl,specularmap_pars_fragment:Xl,tonemapping_fragment:Yl,tonemapping_pars_fragment:Kl,transmission_fragment:ql,transmission_pars_fragment:Zl,uv_pars_fragment:$l,uv_pars_vertex:jl,uv_vertex:Ql,worldpos_vertex:Jl,background_vert:ec,background_frag:tc,backgroundCube_vert:nc,backgroundCube_frag:ic,cube_vert:ac,cube_frag:rc,depth_vert:oc,depth_frag:sc,distance_vert:lc,distance_frag:cc,equirect_vert:fc,equirect_frag:dc,linedashed_vert:uc,linedashed_frag:pc,meshbasic_vert:hc,meshbasic_frag:mc,meshlambert_vert:_c,meshlambert_frag:gc,meshmatcap_vert:vc,meshmatcap_frag:Sc,meshnormal_vert:Ec,meshnormal_frag:xc,meshphong_vert:Mc,meshphong_frag:Tc,meshphysical_vert:Ac,meshphysical_frag:Rc,meshtoon_vert:bc,meshtoon_frag:Cc,points_vert:Pc,points_frag:Dc,shadow_vert:Lc,shadow_frag:wc,sprite_vert:Uc,sprite_frag:Ic},le={common:{diffuse:{value:new Xe(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new ze},alphaMap:{value:null},alphaMapTransform:{value:new ze},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new ze}},envmap:{envMap:{value:null},envMapRotation:{value:new ze},flipEnvMap:{value:-1},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98},dfgLUT:{value:null}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new ze}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new ze}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new ze},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new ze},normalScale:{value:new at(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new ze},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new ze}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new ze}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new ze}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new Xe(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null}},points:{diffuse:{value:new Xe(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new ze},alphaTest:{value:0},uvTransform:{value:new ze}},sprite:{diffuse:{value:new Xe(16777215)},opacity:{value:1},center:{value:new at(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new ze},alphaMap:{value:null},alphaMapTransform:{value:new ze},alphaTest:{value:0}}},bt={basic:{uniforms:_t([le.common,le.specularmap,le.envmap,le.aomap,le.lightmap,le.fog]),vertexShader:Oe.meshbasic_vert,fragmentShader:Oe.meshbasic_frag},lambert:{uniforms:_t([le.common,le.specularmap,le.envmap,le.aomap,le.lightmap,le.emissivemap,le.bumpmap,le.normalmap,le.displacementmap,le.fog,le.lights,{emissive:{value:new Xe(0)},envMapIntensity:{value:1}}]),vertexShader:Oe.meshlambert_vert,fragmentShader:Oe.meshlambert_frag},phong:{uniforms:_t([le.common,le.specularmap,le.envmap,le.aomap,le.lightmap,le.emissivemap,le.bumpmap,le.normalmap,le.displacementmap,le.fog,le.lights,{emissive:{value:new Xe(0)},specular:{value:new Xe(1118481)},shininess:{value:30},envMapIntensity:{value:1}}]),vertexShader:Oe.meshphong_vert,fragmentShader:Oe.meshphong_frag},standard:{uniforms:_t([le.common,le.envmap,le.aomap,le.lightmap,le.emissivemap,le.bumpmap,le.normalmap,le.displacementmap,le.roughnessmap,le.metalnessmap,le.fog,le.lights,{emissive:{value:new Xe(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:Oe.meshphysical_vert,fragmentShader:Oe.meshphysical_frag},toon:{uniforms:_t([le.common,le.aomap,le.lightmap,le.emissivemap,le.bumpmap,le.normalmap,le.displacementmap,le.gradientmap,le.fog,le.lights,{emissive:{value:new Xe(0)}}]),vertexShader:Oe.meshtoon_vert,fragmentShader:Oe.meshtoon_frag},matcap:{uniforms:_t([le.common,le.bumpmap,le.normalmap,le.displacementmap,le.fog,{matcap:{value:null}}]),vertexShader:Oe.meshmatcap_vert,fragmentShader:Oe.meshmatcap_frag},points:{uniforms:_t([le.points,le.fog]),vertexShader:Oe.points_vert,fragmentShader:Oe.points_frag},dashed:{uniforms:_t([le.common,le.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:Oe.linedashed_vert,fragmentShader:Oe.linedashed_frag},depth:{uniforms:_t([le.common,le.displacementmap]),vertexShader:Oe.depth_vert,fragmentShader:Oe.depth_frag},normal:{uniforms:_t([le.common,le.bumpmap,le.normalmap,le.displacementmap,{opacity:{value:1}}]),vertexShader:Oe.meshnormal_vert,fragmentShader:Oe.meshnormal_frag},sprite:{uniforms:_t([le.sprite,le.fog]),vertexShader:Oe.sprite_vert,fragmentShader:Oe.sprite_frag},background:{uniforms:{uvTransform:{value:new ze},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:Oe.background_vert,fragmentShader:Oe.background_frag},backgroundCube:{uniforms:{envMap:{value:null},flipEnvMap:{value:-1},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new ze}},vertexShader:Oe.backgroundCube_vert,fragmentShader:Oe.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:Oe.cube_vert,fragmentShader:Oe.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:Oe.equirect_vert,fragmentShader:Oe.equirect_frag},distance:{uniforms:_t([le.common,le.displacementmap,{referencePosition:{value:new Ue},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:Oe.distance_vert,fragmentShader:Oe.distance_frag},shadow:{uniforms:_t([le.lights,le.fog,{color:{value:new Xe(0)},opacity:{value:1}}]),vertexShader:Oe.shadow_vert,fragmentShader:Oe.shadow_frag}};bt.physical={uniforms:_t([bt.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new ze},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new ze},clearcoatNormalScale:{value:new at(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new ze},dispersion:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new ze},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new ze},sheen:{value:0},sheenColor:{value:new Xe(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new ze},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new ze},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new ze},transmissionSamplerSize:{value:new at},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new ze},attenuationDistance:{value:0},attenuationColor:{value:new Xe(0)},specularColor:{value:new Xe(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new ze},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new ze},anisotropyVector:{value:new at},anisotropyMap:{value:null},anisotropyMapTransform:{value:new ze}}]),vertexShader:Oe.meshphysical_vert,fragmentShader:Oe.meshphysical_frag};const En={r:0,b:0,g:0},kt=new Ja,yc=new tn;function Nc(e,n,t,i,o,r){const f=new Xe(0);let m=o===!0?0:1,P,A,G=null,D=0,h=null;function x(_){let T=_.isScene===!0?_.background:null;if(T&&T.isTexture){const v=_.backgroundBlurriness>0;T=n.get(T,v)}return T}function S(_){let T=!1;const v=x(_);v===null?c(f,m):v&&v.isColor&&(c(v,1),T=!0);const y=e.xr.getEnvironmentBlendMode();y==="additive"?t.buffers.color.setClear(0,0,0,1,r):y==="alpha-blend"&&t.buffers.color.setClear(0,0,0,0,r),(e.autoClear||T)&&(t.buffers.depth.setTest(!0),t.buffers.depth.setMask(!0),t.buffers.color.setMask(!0),e.clear(e.autoClearColor,e.autoClearDepth,e.autoClearStencil))}function I(_,T){const v=x(T);v&&(v.isCubeTexture||v.mapping===In)?(A===void 0&&(A=new vt(new ci(1,1,1),new yt({name:"BackgroundCubeMaterial",uniforms:ai(bt.backgroundCube.uniforms),vertexShader:bt.backgroundCube.vertexShader,fragmentShader:bt.backgroundCube.fragmentShader,side:Mt,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),A.geometry.deleteAttribute("normal"),A.geometry.deleteAttribute("uv"),A.onBeforeRender=function(y,C,U){this.matrixWorld.copyPosition(U.matrixWorld)},Object.defineProperty(A.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),i.update(A)),kt.copy(T.backgroundRotation),kt.x*=-1,kt.y*=-1,kt.z*=-1,v.isCubeTexture&&v.isRenderTargetTexture===!1&&(kt.y*=-1,kt.z*=-1),A.material.uniforms.envMap.value=v,A.material.uniforms.flipEnvMap.value=v.isCubeTexture&&v.isRenderTargetTexture===!1?-1:1,A.material.uniforms.backgroundBlurriness.value=T.backgroundBlurriness,A.material.uniforms.backgroundIntensity.value=T.backgroundIntensity,A.material.uniforms.backgroundRotation.value.setFromMatrix4(yc.makeRotationFromEuler(kt)),A.material.toneMapped=lt.getTransfer(v.colorSpace)!==it,(G!==v||D!==v.version||h!==e.toneMapping)&&(A.material.needsUpdate=!0,G=v,D=v.version,h=e.toneMapping),A.layers.enableAll(),_.unshift(A,A.geometry,A.material,0,0,null)):v&&v.isTexture&&(P===void 0&&(P=new vt(new Za(2,2),new yt({name:"BackgroundMaterial",uniforms:ai(bt.background.uniforms),vertexShader:bt.background.vertexShader,fragmentShader:bt.background.fragmentShader,side:pn,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),P.geometry.deleteAttribute("normal"),Object.defineProperty(P.material,"map",{get:function(){return this.uniforms.t2D.value}}),i.update(P)),P.material.uniforms.t2D.value=v,P.material.uniforms.backgroundIntensity.value=T.backgroundIntensity,P.material.toneMapped=lt.getTransfer(v.colorSpace)!==it,v.matrixAutoUpdate===!0&&v.updateMatrix(),P.material.uniforms.uvTransform.value.copy(v.matrix),(G!==v||D!==v.version||h!==e.toneMapping)&&(P.material.needsUpdate=!0,G=v,D=v.version,h=e.toneMapping),P.layers.enableAll(),_.unshift(P,P.geometry,P.material,0,0,null))}function c(_,T){_.getRGB(En,Qa(e)),t.buffers.color.setClear(En.r,En.g,En.b,T,r)}function s(){A!==void 0&&(A.geometry.dispose(),A.material.dispose(),A=void 0),P!==void 0&&(P.geometry.dispose(),P.material.dispose(),P=void 0)}return{getClearColor:function(){return f},setClearColor:function(_,T=1){f.set(_),m=T,c(f,m)},getClearAlpha:function(){return m},setClearAlpha:function(_){m=_,c(f,m)},render:S,addToRenderList:I,dispose:s}}function Fc(e,n){const t=e.getParameter(e.MAX_VERTEX_ATTRIBS),i={},o=h(null);let r=o,f=!1;function m(R,H,V,z,K){let N=!1;const F=D(R,z,V,H);r!==F&&(r=F,A(r.object)),N=x(R,z,V,K),N&&S(R,z,V,K),K!==null&&n.update(K,e.ELEMENT_ARRAY_BUFFER),(N||f)&&(f=!1,v(R,H,V,z),K!==null&&e.bindBuffer(e.ELEMENT_ARRAY_BUFFER,n.get(K).buffer))}function P(){return e.createVertexArray()}function A(R){return e.bindVertexArray(R)}function G(R){return e.deleteVertexArray(R)}function D(R,H,V,z){const K=z.wireframe===!0;let N=i[H.id];N===void 0&&(N={},i[H.id]=N);const F=R.isInstancedMesh===!0?R.id:0;let se=N[F];se===void 0&&(se={},N[F]=se);let Y=se[V.id];Y===void 0&&(Y={},se[V.id]=Y);let ae=Y[K];return ae===void 0&&(ae=h(P()),Y[K]=ae),ae}function h(R){const H=[],V=[],z=[];for(let K=0;K<t;K++)H[K]=0,V[K]=0,z[K]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:H,enabledAttributes:V,attributeDivisors:z,object:R,attributes:{},index:null}}function x(R,H,V,z){const K=r.attributes,N=H.attributes;let F=0;const se=V.getAttributes();for(const Y in se)if(se[Y].location>=0){const te=K[Y];let j=N[Y];if(j===void 0&&(Y==="instanceMatrix"&&R.instanceMatrix&&(j=R.instanceMatrix),Y==="instanceColor"&&R.instanceColor&&(j=R.instanceColor)),te===void 0||te.attribute!==j||j&&te.data!==j.data)return!0;F++}return r.attributesNum!==F||r.index!==z}function S(R,H,V,z){const K={},N=H.attributes;let F=0;const se=V.getAttributes();for(const Y in se)if(se[Y].location>=0){let te=N[Y];te===void 0&&(Y==="instanceMatrix"&&R.instanceMatrix&&(te=R.instanceMatrix),Y==="instanceColor"&&R.instanceColor&&(te=R.instanceColor));const j={};j.attribute=te,te&&te.data&&(j.data=te.data),K[Y]=j,F++}r.attributes=K,r.attributesNum=F,r.index=z}function I(){const R=r.newAttributes;for(let H=0,V=R.length;H<V;H++)R[H]=0}function c(R){s(R,0)}function s(R,H){const V=r.newAttributes,z=r.enabledAttributes,K=r.attributeDivisors;V[R]=1,z[R]===0&&(e.enableVertexAttribArray(R),z[R]=1),K[R]!==H&&(e.vertexAttribDivisor(R,H),K[R]=H)}function _(){const R=r.newAttributes,H=r.enabledAttributes;for(let V=0,z=H.length;V<z;V++)H[V]!==R[V]&&(e.disableVertexAttribArray(V),H[V]=0)}function T(R,H,V,z,K,N,F){F===!0?e.vertexAttribIPointer(R,H,V,K,N):e.vertexAttribPointer(R,H,V,z,K,N)}function v(R,H,V,z){I();const K=z.attributes,N=V.getAttributes(),F=H.defaultAttributeValues;for(const se in N){const Y=N[se];if(Y.location>=0){let ae=K[se];if(ae===void 0&&(se==="instanceMatrix"&&R.instanceMatrix&&(ae=R.instanceMatrix),se==="instanceColor"&&R.instanceColor&&(ae=R.instanceColor)),ae!==void 0){const te=ae.normalized,j=ae.itemSize,de=n.get(ae);if(de===void 0)continue;const Ce=de.buffer,me=de.type,B=de.bytesPerElement,q=me===e.INT||me===e.UNSIGNED_INT||ae.gpuType===$a;if(ae.isInterleavedBufferAttribute){const Q=ae.data,De=Q.stride,_e=ae.offset;if(Q.isInstancedInterleavedBuffer){for(let Me=0;Me<Y.locationSize;Me++)s(Y.location+Me,Q.meshPerAttribute);R.isInstancedMesh!==!0&&z._maxInstanceCount===void 0&&(z._maxInstanceCount=Q.meshPerAttribute*Q.count)}else for(let Me=0;Me<Y.locationSize;Me++)c(Y.location+Me);e.bindBuffer(e.ARRAY_BUFFER,Ce);for(let Me=0;Me<Y.locationSize;Me++)T(Y.location+Me,j/Y.locationSize,me,te,De*B,(_e+j/Y.locationSize*Me)*B,q)}else{if(ae.isInstancedBufferAttribute){for(let Q=0;Q<Y.locationSize;Q++)s(Y.location+Q,ae.meshPerAttribute);R.isInstancedMesh!==!0&&z._maxInstanceCount===void 0&&(z._maxInstanceCount=ae.meshPerAttribute*ae.count)}else for(let Q=0;Q<Y.locationSize;Q++)c(Y.location+Q);e.bindBuffer(e.ARRAY_BUFFER,Ce);for(let Q=0;Q<Y.locationSize;Q++)T(Y.location+Q,j/Y.locationSize,me,te,j*B,j/Y.locationSize*Q*B,q)}}else if(F!==void 0){const te=F[se];if(te!==void 0)switch(te.length){case 2:e.vertexAttrib2fv(Y.location,te);break;case 3:e.vertexAttrib3fv(Y.location,te);break;case 4:e.vertexAttrib4fv(Y.location,te);break;default:e.vertexAttrib1fv(Y.location,te)}}}}_()}function y(){p();for(const R in i){const H=i[R];for(const V in H){const z=H[V];for(const K in z){const N=z[K];for(const F in N)G(N[F].object),delete N[F];delete z[K]}}delete i[R]}}function C(R){if(i[R.id]===void 0)return;const H=i[R.id];for(const V in H){const z=H[V];for(const K in z){const N=z[K];for(const F in N)G(N[F].object),delete N[F];delete z[K]}}delete i[R.id]}function U(R){for(const H in i){const V=i[H];for(const z in V){const K=V[z];if(K[R.id]===void 0)continue;const N=K[R.id];for(const F in N)G(N[F].object),delete N[F];delete K[R.id]}}}function d(R){for(const H in i){const V=i[H],z=R.isInstancedMesh===!0?R.id:0,K=V[z];if(K!==void 0){for(const N in K){const F=K[N];for(const se in F)G(F[se].object),delete F[se];delete K[N]}delete V[z],Object.keys(V).length===0&&delete i[H]}}}function p(){$(),f=!0,r!==o&&(r=o,A(r.object))}function $(){o.geometry=null,o.program=null,o.wireframe=!1}return{setup:m,reset:p,resetDefaultState:$,dispose:y,releaseStatesOfGeometry:C,releaseStatesOfObject:d,releaseStatesOfProgram:U,initAttributes:I,enableAttribute:c,disableUnusedAttributes:_}}function Oc(e,n,t){let i;function o(A){i=A}function r(A,G){e.drawArrays(i,A,G),t.update(G,i,1)}function f(A,G,D){D!==0&&(e.drawArraysInstanced(i,A,G,D),t.update(G,i,D))}function m(A,G,D){if(D===0)return;n.get("WEBGL_multi_draw").multiDrawArraysWEBGL(i,A,0,G,0,D);let x=0;for(let S=0;S<D;S++)x+=G[S];t.update(x,i,1)}function P(A,G,D,h){if(D===0)return;const x=n.get("WEBGL_multi_draw");if(x===null)for(let S=0;S<A.length;S++)f(A[S],G[S],h[S]);else{x.multiDrawArraysInstancedWEBGL(i,A,0,G,0,h,0,D);let S=0;for(let I=0;I<D;I++)S+=G[I]*h[I];t.update(S,i,1)}}this.setMode=o,this.render=r,this.renderInstances=f,this.renderMultiDraw=m,this.renderMultiDrawInstances=P}function Bc(e,n,t,i){let o;function r(){if(o!==void 0)return o;if(n.has("EXT_texture_filter_anisotropic")===!0){const U=n.get("EXT_texture_filter_anisotropic");o=e.getParameter(U.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else o=0;return o}function f(U){return!(U!==Ut&&i.convert(U)!==e.getParameter(e.IMPLEMENTATION_COLOR_READ_FORMAT))}function m(U){const d=U===Gt&&(n.has("EXT_color_buffer_half_float")||n.has("EXT_color_buffer_float"));return!(U!==Ct&&i.convert(U)!==e.getParameter(e.IMPLEMENTATION_COLOR_READ_TYPE)&&U!==Ot&&!d)}function P(U){if(U==="highp"){if(e.getShaderPrecisionFormat(e.VERTEX_SHADER,e.HIGH_FLOAT).precision>0&&e.getShaderPrecisionFormat(e.FRAGMENT_SHADER,e.HIGH_FLOAT).precision>0)return"highp";U="mediump"}return U==="mediump"&&e.getShaderPrecisionFormat(e.VERTEX_SHADER,e.MEDIUM_FLOAT).precision>0&&e.getShaderPrecisionFormat(e.FRAGMENT_SHADER,e.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let A=t.precision!==void 0?t.precision:"highp";const G=P(A);G!==A&&(tt("WebGLRenderer:",A,"not supported, using",G,"instead."),A=G);const D=t.logarithmicDepthBuffer===!0,h=t.reversedDepthBuffer===!0&&n.has("EXT_clip_control"),x=e.getParameter(e.MAX_TEXTURE_IMAGE_UNITS),S=e.getParameter(e.MAX_VERTEX_TEXTURE_IMAGE_UNITS),I=e.getParameter(e.MAX_TEXTURE_SIZE),c=e.getParameter(e.MAX_CUBE_MAP_TEXTURE_SIZE),s=e.getParameter(e.MAX_VERTEX_ATTRIBS),_=e.getParameter(e.MAX_VERTEX_UNIFORM_VECTORS),T=e.getParameter(e.MAX_VARYING_VECTORS),v=e.getParameter(e.MAX_FRAGMENT_UNIFORM_VECTORS),y=e.getParameter(e.MAX_SAMPLES),C=e.getParameter(e.SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:r,getMaxPrecision:P,textureFormatReadable:f,textureTypeReadable:m,precision:A,logarithmicDepthBuffer:D,reversedDepthBuffer:h,maxTextures:x,maxVertexTextures:S,maxTextureSize:I,maxCubemapSize:c,maxAttributes:s,maxVertexUniforms:_,maxVaryings:T,maxFragmentUniforms:v,maxSamples:y,samples:C}}function Gc(e){const n=this;let t=null,i=0,o=!1,r=!1;const f=new Va,m=new ze,P={value:null,needsUpdate:!1};this.uniform=P,this.numPlanes=0,this.numIntersection=0,this.init=function(D,h){const x=D.length!==0||h||i!==0||o;return o=h,i=D.length,x},this.beginShadows=function(){r=!0,G(null)},this.endShadows=function(){r=!1},this.setGlobalState=function(D,h){t=G(D,h,0)},this.setState=function(D,h,x){const S=D.clippingPlanes,I=D.clipIntersection,c=D.clipShadows,s=e.get(D);if(!o||S===null||S.length===0||r&&!c)r?G(null):A();else{const _=r?0:i,T=_*4;let v=s.clippingState||null;P.value=v,v=G(S,h,T,x);for(let y=0;y!==T;++y)v[y]=t[y];s.clippingState=v,this.numIntersection=I?this.numPlanes:0,this.numPlanes+=_}};function A(){P.value!==t&&(P.value=t,P.needsUpdate=i>0),n.numPlanes=i,n.numIntersection=0}function G(D,h,x,S){const I=D!==null?D.length:0;let c=null;if(I!==0){if(c=P.value,S!==!0||c===null){const s=x+I*4,_=h.matrixWorldInverse;m.getNormalMatrix(_),(c===null||c.length<s)&&(c=new Float32Array(s));for(let T=0,v=x;T!==I;++T,v+=4)f.copy(D[T]).applyMatrix4(_,m),f.normal.toArray(c,v),c[v+3]=f.constant}P.value=c,P.needsUpdate=!0}return n.numPlanes=I,n.numIntersection=0,c}}const Bt=4,ua=[.125,.215,.35,.446,.526,.582],zt=20,Hc=256,ln=new Ha,pa=new Xe;let $n=null,jn=0,Qn=0,Jn=!1;const Vc=new Ue;class ha{constructor(n){this._renderer=n,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._sizeLods=[],this._sigmas=[],this._lodMeshes=[],this._backgroundBox=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._blurMaterial=null,this._ggxMaterial=null}fromScene(n,t=0,i=.1,o=100,r={}){const{size:f=256,position:m=Vc}=r;$n=this._renderer.getRenderTarget(),jn=this._renderer.getActiveCubeFace(),Qn=this._renderer.getActiveMipmapLevel(),Jn=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(f);const P=this._allocateTargets();return P.depthBuffer=!0,this._sceneToCubeUV(n,i,o,P,m),t>0&&this._blur(P,0,0,t),this._applyPMREM(P),this._cleanup(P),P}fromEquirectangular(n,t=null){return this._fromTexture(n,t)}fromCubemap(n,t=null){return this._fromTexture(n,t)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=ga(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=_a(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose(),this._backgroundBox!==null&&(this._backgroundBox.geometry.dispose(),this._backgroundBox.material.dispose())}_setSize(n){this._lodMax=Math.floor(Math.log2(n)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._ggxMaterial!==null&&this._ggxMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let n=0;n<this._lodMeshes.length;n++)this._lodMeshes[n].geometry.dispose()}_cleanup(n){this._renderer.setRenderTarget($n,jn,Qn),this._renderer.xr.enabled=Jn,n.scissorTest=!1,Zt(n,0,0,n.width,n.height)}_fromTexture(n,t){n.mapping===_n||n.mapping===rn?this._setSize(n.image.length===0?16:n.image[0].width||n.image[0].image.width):this._setSize(n.image.width/4),$n=this._renderer.getRenderTarget(),jn=this._renderer.getActiveCubeFace(),Qn=this._renderer.getActiveMipmapLevel(),Jn=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;const i=t||this._allocateTargets();return this._textureToCubeUV(n,i),this._applyPMREM(i),this._cleanup(i),i}_allocateTargets(){const n=3*Math.max(this._cubeSize,112),t=4*this._cubeSize,i={magFilter:xt,minFilter:xt,generateMipmaps:!1,type:Gt,format:Ut,colorSpace:Un,depthBuffer:!1},o=ma(n,t,i);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==n||this._pingPongRenderTarget.height!==t){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=ma(n,t,i);const{_lodMax:r}=this;({lodMeshes:this._lodMeshes,sizeLods:this._sizeLods,sigmas:this._sigmas}=kc(r)),this._blurMaterial=zc(r,n,t),this._ggxMaterial=Wc(r,n,t)}return o}_compileMaterial(n){const t=new vt(new nn,n);this._renderer.compile(t,ln)}_sceneToCubeUV(n,t,i,o,r){const P=new un(90,1,t,i),A=[1,-1,1,1,1,1],G=[1,1,1,-1,-1,-1],D=this._renderer,h=D.autoClear,x=D.toneMapping;D.getClearColor(pa),D.toneMapping=Pt,D.autoClear=!1,D.state.buffers.depth.getReversed()&&(D.setRenderTarget(o),D.clearDepth(),D.setRenderTarget(null)),this._backgroundBox===null&&(this._backgroundBox=new vt(new ci,new Cn({name:"PMREM.Background",side:Mt,depthWrite:!1,depthTest:!1})));const I=this._backgroundBox,c=I.material;let s=!1;const _=n.background;_?_.isColor&&(c.color.copy(_),n.background=null,s=!0):(c.color.copy(pa),s=!0);for(let T=0;T<6;T++){const v=T%3;v===0?(P.up.set(0,A[T],0),P.position.set(r.x,r.y,r.z),P.lookAt(r.x+G[T],r.y,r.z)):v===1?(P.up.set(0,0,A[T]),P.position.set(r.x,r.y,r.z),P.lookAt(r.x,r.y+G[T],r.z)):(P.up.set(0,A[T],0),P.position.set(r.x,r.y,r.z),P.lookAt(r.x,r.y,r.z+G[T]));const y=this._cubeSize;Zt(o,v*y,T>2?y:0,y,y),D.setRenderTarget(o),s&&D.render(I,P),D.render(n,P)}D.toneMapping=x,D.autoClear=h,n.background=_}_textureToCubeUV(n,t){const i=this._renderer,o=n.mapping===_n||n.mapping===rn;o?(this._cubemapMaterial===null&&(this._cubemapMaterial=ga()),this._cubemapMaterial.uniforms.flipEnvMap.value=n.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=_a());const r=o?this._cubemapMaterial:this._equirectMaterial,f=this._lodMeshes[0];f.material=r;const m=r.uniforms;m.envMap.value=n;const P=this._cubeSize;Zt(t,0,0,3*P,2*P),i.setRenderTarget(t),i.render(f,ln)}_applyPMREM(n){const t=this._renderer,i=t.autoClear;t.autoClear=!1;const o=this._lodMeshes.length;for(let r=1;r<o;r++)this._applyGGXFilter(n,r-1,r);t.autoClear=i}_applyGGXFilter(n,t,i){const o=this._renderer,r=this._pingPongRenderTarget,f=this._ggxMaterial,m=this._lodMeshes[i];m.material=f;const P=f.uniforms,A=i/(this._lodMeshes.length-1),G=t/(this._lodMeshes.length-1),D=Math.sqrt(A*A-G*G),h=0+A*1.25,x=D*h,{_lodMax:S}=this,I=this._sizeLods[i],c=3*I*(i>S-Bt?i-S+Bt:0),s=4*(this._cubeSize-I);P.envMap.value=n.texture,P.roughness.value=x,P.mipInt.value=S-t,Zt(r,c,s,3*I,2*I),o.setRenderTarget(r),o.render(m,ln),P.envMap.value=r.texture,P.roughness.value=0,P.mipInt.value=S-i,Zt(n,c,s,3*I,2*I),o.setRenderTarget(n),o.render(m,ln)}_blur(n,t,i,o,r){const f=this._pingPongRenderTarget;this._halfBlur(n,f,t,i,o,"latitudinal",r),this._halfBlur(f,n,i,i,o,"longitudinal",r)}_halfBlur(n,t,i,o,r,f,m){const P=this._renderer,A=this._blurMaterial;f!=="latitudinal"&&f!=="longitudinal"&&rt("blur direction must be either latitudinal or longitudinal!");const G=3,D=this._lodMeshes[o];D.material=A;const h=A.uniforms,x=this._sizeLods[i]-1,S=isFinite(r)?Math.PI/(2*x):2*Math.PI/(2*zt-1),I=r/S,c=isFinite(r)?1+Math.floor(G*I):zt;c>zt&&tt(`sigmaRadians, ${r}, is too large and will clip, as it requested ${c} samples when the maximum is set to ${zt}`);const s=[];let _=0;for(let U=0;U<zt;++U){const d=U/I,p=Math.exp(-d*d/2);s.push(p),U===0?_+=p:U<c&&(_+=2*p)}for(let U=0;U<s.length;U++)s[U]=s[U]/_;h.envMap.value=n.texture,h.samples.value=c,h.weights.value=s,h.latitudinal.value=f==="latitudinal",m&&(h.poleAxis.value=m);const{_lodMax:T}=this;h.dTheta.value=S,h.mipInt.value=T-i;const v=this._sizeLods[o],y=3*v*(o>T-Bt?o-T+Bt:0),C=4*(this._cubeSize-v);Zt(t,y,C,3*v,2*v),P.setRenderTarget(t),P.render(D,ln)}}function kc(e){const n=[],t=[],i=[];let o=e;const r=e-Bt+1+ua.length;for(let f=0;f<r;f++){const m=Math.pow(2,o);n.push(m);let P=1/m;f>e-Bt?P=ua[f-e+Bt-1]:f===0&&(P=0),t.push(P);const A=1/(m-2),G=-A,D=1+A,h=[G,G,D,G,D,D,G,G,D,D,G,D],x=6,S=6,I=3,c=2,s=1,_=new Float32Array(I*S*x),T=new Float32Array(c*S*x),v=new Float32Array(s*S*x);for(let C=0;C<x;C++){const U=C%3*2/3-1,d=C>2?0:-1,p=[U,d,0,U+2/3,d,0,U+2/3,d+1,0,U,d,0,U+2/3,d+1,0,U,d+1,0];_.set(p,I*S*C),T.set(h,c*S*C);const $=[C,C,C,C,C,C];v.set($,s*S*C)}const y=new nn;y.setAttribute("position",new An(_,I)),y.setAttribute("uv",new An(T,c)),y.setAttribute("faceIndex",new An(v,s)),i.push(new vt(y,null)),o>Bt&&o--}return{lodMeshes:i,sizeLods:n,sigmas:t}}function ma(e,n,t){const i=new Dt(e,n,t);return i.texture.mapping=In,i.texture.name="PMREM.cubeUv",i.scissorTest=!0,i}function Zt(e,n,t,i,o){e.viewport.set(n,t,i,o),e.scissor.set(n,t,i,o)}function Wc(e,n,t){return new yt({name:"PMREMGGXConvolution",defines:{GGX_SAMPLES:Hc,CUBEUV_TEXEL_WIDTH:1/n,CUBEUV_TEXEL_HEIGHT:1/t,CUBEUV_MAX_MIP:`${e}.0`},uniforms:{envMap:{value:null},roughness:{value:0},mipInt:{value:0}},vertexShader:yn(),fragmentShader:`

			precision highp float;
			precision highp int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform float roughness;
			uniform float mipInt;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			#define PI 3.14159265359

			// Van der Corput radical inverse
			float radicalInverse_VdC(uint bits) {
				bits = (bits << 16u) | (bits >> 16u);
				bits = ((bits & 0x55555555u) << 1u) | ((bits & 0xAAAAAAAAu) >> 1u);
				bits = ((bits & 0x33333333u) << 2u) | ((bits & 0xCCCCCCCCu) >> 2u);
				bits = ((bits & 0x0F0F0F0Fu) << 4u) | ((bits & 0xF0F0F0F0u) >> 4u);
				bits = ((bits & 0x00FF00FFu) << 8u) | ((bits & 0xFF00FF00u) >> 8u);
				return float(bits) * 2.3283064365386963e-10; // / 0x100000000
			}

			// Hammersley sequence
			vec2 hammersley(uint i, uint N) {
				return vec2(float(i) / float(N), radicalInverse_VdC(i));
			}

			// GGX VNDF importance sampling (Eric Heitz 2018)
			// "Sampling the GGX Distribution of Visible Normals"
			// https://jcgt.org/published/0007/04/01/
			vec3 importanceSampleGGX_VNDF(vec2 Xi, vec3 V, float roughness) {
				float alpha = roughness * roughness;

				// Section 4.1: Orthonormal basis
				vec3 T1 = vec3(1.0, 0.0, 0.0);
				vec3 T2 = cross(V, T1);

				// Section 4.2: Parameterization of projected area
				float r = sqrt(Xi.x);
				float phi = 2.0 * PI * Xi.y;
				float t1 = r * cos(phi);
				float t2 = r * sin(phi);
				float s = 0.5 * (1.0 + V.z);
				t2 = (1.0 - s) * sqrt(1.0 - t1 * t1) + s * t2;

				// Section 4.3: Reprojection onto hemisphere
				vec3 Nh = t1 * T1 + t2 * T2 + sqrt(max(0.0, 1.0 - t1 * t1 - t2 * t2)) * V;

				// Section 3.4: Transform back to ellipsoid configuration
				return normalize(vec3(alpha * Nh.x, alpha * Nh.y, max(0.0, Nh.z)));
			}

			void main() {
				vec3 N = normalize(vOutputDirection);
				vec3 V = N; // Assume view direction equals normal for pre-filtering

				vec3 prefilteredColor = vec3(0.0);
				float totalWeight = 0.0;

				// For very low roughness, just sample the environment directly
				if (roughness < 0.001) {
					gl_FragColor = vec4(bilinearCubeUV(envMap, N, mipInt), 1.0);
					return;
				}

				// Tangent space basis for VNDF sampling
				vec3 up = abs(N.z) < 0.999 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0);
				vec3 tangent = normalize(cross(up, N));
				vec3 bitangent = cross(N, tangent);

				for(uint i = 0u; i < uint(GGX_SAMPLES); i++) {
					vec2 Xi = hammersley(i, uint(GGX_SAMPLES));

					// For PMREM, V = N, so in tangent space V is always (0, 0, 1)
					vec3 H_tangent = importanceSampleGGX_VNDF(Xi, vec3(0.0, 0.0, 1.0), roughness);

					// Transform H back to world space
					vec3 H = normalize(tangent * H_tangent.x + bitangent * H_tangent.y + N * H_tangent.z);
					vec3 L = normalize(2.0 * dot(V, H) * H - V);

					float NdotL = max(dot(N, L), 0.0);

					if(NdotL > 0.0) {
						// Sample environment at fixed mip level
						// VNDF importance sampling handles the distribution filtering
						vec3 sampleColor = bilinearCubeUV(envMap, L, mipInt);

						// Weight by NdotL for the split-sum approximation
						// VNDF PDF naturally accounts for the visible microfacet distribution
						prefilteredColor += sampleColor * NdotL;
						totalWeight += NdotL;
					}
				}

				if (totalWeight > 0.0) {
					prefilteredColor = prefilteredColor / totalWeight;
				}

				gl_FragColor = vec4(prefilteredColor, 1.0);
			}
		`,blending:It,depthTest:!1,depthWrite:!1})}function zc(e,n,t){const i=new Float32Array(zt),o=new Ue(0,1,0);return new yt({name:"SphericalGaussianBlur",defines:{n:zt,CUBEUV_TEXEL_WIDTH:1/n,CUBEUV_TEXEL_HEIGHT:1/t,CUBEUV_MAX_MIP:`${e}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:i},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:o}},vertexShader:yn(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform int samples;
			uniform float weights[ n ];
			uniform bool latitudinal;
			uniform float dTheta;
			uniform float mipInt;
			uniform vec3 poleAxis;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			vec3 getSample( float theta, vec3 axis ) {

				float cosTheta = cos( theta );
				// Rodrigues' axis-angle rotation
				vec3 sampleDirection = vOutputDirection * cosTheta
					+ cross( axis, vOutputDirection ) * sin( theta )
					+ axis * dot( axis, vOutputDirection ) * ( 1.0 - cosTheta );

				return bilinearCubeUV( envMap, sampleDirection, mipInt );

			}

			void main() {

				vec3 axis = latitudinal ? poleAxis : cross( poleAxis, vOutputDirection );

				if ( all( equal( axis, vec3( 0.0 ) ) ) ) {

					axis = vec3( vOutputDirection.z, 0.0, - vOutputDirection.x );

				}

				axis = normalize( axis );

				gl_FragColor = vec4( 0.0, 0.0, 0.0, 1.0 );
				gl_FragColor.rgb += weights[ 0 ] * getSample( 0.0, axis );

				for ( int i = 1; i < n; i++ ) {

					if ( i >= samples ) {

						break;

					}

					float theta = dTheta * float( i );
					gl_FragColor.rgb += weights[ i ] * getSample( -1.0 * theta, axis );
					gl_FragColor.rgb += weights[ i ] * getSample( theta, axis );

				}

			}
		`,blending:It,depthTest:!1,depthWrite:!1})}function _a(){return new yt({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:yn(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;

			#include <common>

			void main() {

				vec3 outputDirection = normalize( vOutputDirection );
				vec2 uv = equirectUv( outputDirection );

				gl_FragColor = vec4( texture2D ( envMap, uv ).rgb, 1.0 );

			}
		`,blending:It,depthTest:!1,depthWrite:!1})}function ga(){return new yt({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:yn(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:It,depthTest:!1,depthWrite:!1})}function yn(){return`

		precision mediump float;
		precision mediump int;

		attribute float faceIndex;

		varying vec3 vOutputDirection;

		// RH coordinate system; PMREM face-indexing convention
		vec3 getDirection( vec2 uv, float face ) {

			uv = 2.0 * uv - 1.0;

			vec3 direction = vec3( uv, 1.0 );

			if ( face == 0.0 ) {

				direction = direction.zyx; // ( 1, v, u ) pos x

			} else if ( face == 1.0 ) {

				direction = direction.xzy;
				direction.xz *= -1.0; // ( -u, 1, -v ) pos y

			} else if ( face == 2.0 ) {

				direction.x *= -1.0; // ( -u, v, 1 ) pos z

			} else if ( face == 3.0 ) {

				direction = direction.zyx;
				direction.xz *= -1.0; // ( -1, v, -u ) neg x

			} else if ( face == 4.0 ) {

				direction = direction.xzy;
				direction.xy *= -1.0; // ( -u, -1, v ) neg y

			} else if ( face == 5.0 ) {

				direction.z *= -1.0; // ( u, v, -1 ) neg z

			}

			return direction;

		}

		void main() {

			vOutputDirection = getDirection( uv, faceIndex );
			gl_Position = vec4( position, 1.0 );

		}
	`}class fr extends Dt{constructor(n=1,t={}){super(n,n,t),this.isWebGLCubeRenderTarget=!0;const i={width:n,height:n,depth:1},o=[i,i,i,i,i,i];this.texture=new er(o),this._setTextureOptions(t),this.texture.isRenderTargetTexture=!0}fromEquirectangularTexture(n,t){this.texture.type=t.type,this.texture.colorSpace=t.colorSpace,this.texture.generateMipmaps=t.generateMipmaps,this.texture.minFilter=t.minFilter,this.texture.magFilter=t.magFilter;const i={uniforms:{tEquirect:{value:null}},vertexShader:`

				varying vec3 vWorldDirection;

				vec3 transformDirection( in vec3 dir, in mat4 matrix ) {

					return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );

				}

				void main() {

					vWorldDirection = transformDirection( position, modelMatrix );

					#include <begin_vertex>
					#include <project_vertex>

				}
			`,fragmentShader:`

				uniform sampler2D tEquirect;

				varying vec3 vWorldDirection;

				#include <common>

				void main() {

					vec3 direction = normalize( vWorldDirection );

					vec2 sampleUV = equirectUv( direction );

					gl_FragColor = texture2D( tEquirect, sampleUV );

				}
			`},o=new ci(5,5,5),r=new yt({name:"CubemapFromEquirect",uniforms:ai(i.uniforms),vertexShader:i.vertexShader,fragmentShader:i.fragmentShader,side:Mt,blending:It});r.uniforms.tEquirect.value=t;const f=new vt(o,r),m=t.minFilter;return t.minFilter===jt&&(t.minFilter=xt),new Po(1,10,this).update(n,f),t.minFilter=m,f.geometry.dispose(),f.material.dispose(),this}clear(n,t=!0,i=!0,o=!0){const r=n.getRenderTarget();for(let f=0;f<6;f++)n.setRenderTarget(this,f),n.clear(t,i,o);n.setRenderTarget(r)}}function Xc(e){let n=new WeakMap,t=new WeakMap,i=null;function o(h,x=!1){return h==null?null:x?f(h):r(h)}function r(h){if(h&&h.isTexture){const x=h.mapping;if(x===zn||x===Xn)if(n.has(h)){const S=n.get(h).texture;return m(S,h.mapping)}else{const S=h.image;if(S&&S.height>0){const I=new fr(S.height);return I.fromEquirectangularTexture(e,h),n.set(h,I),h.addEventListener("dispose",A),m(I.texture,h.mapping)}else return null}}return h}function f(h){if(h&&h.isTexture){const x=h.mapping,S=x===zn||x===Xn,I=x===_n||x===rn;if(S||I){let c=t.get(h);const s=c!==void 0?c.texture.pmremVersion:0;if(h.isRenderTargetTexture&&h.pmremVersion!==s)return i===null&&(i=new ha(e)),c=S?i.fromEquirectangular(h,c):i.fromCubemap(h,c),c.texture.pmremVersion=h.pmremVersion,t.set(h,c),c.texture;if(c!==void 0)return c.texture;{const _=h.image;return S&&_&&_.height>0||I&&_&&P(_)?(i===null&&(i=new ha(e)),c=S?i.fromEquirectangular(h):i.fromCubemap(h),c.texture.pmremVersion=h.pmremVersion,t.set(h,c),h.addEventListener("dispose",G),c.texture):null}}}return h}function m(h,x){return x===zn?h.mapping=_n:x===Xn&&(h.mapping=rn),h}function P(h){let x=0;const S=6;for(let I=0;I<S;I++)h[I]!==void 0&&x++;return x===S}function A(h){const x=h.target;x.removeEventListener("dispose",A);const S=n.get(x);S!==void 0&&(n.delete(x),S.dispose())}function G(h){const x=h.target;x.removeEventListener("dispose",G);const S=t.get(x);S!==void 0&&(t.delete(x),S.dispose())}function D(){n=new WeakMap,t=new WeakMap,i!==null&&(i.dispose(),i=null)}return{get:o,dispose:D}}function Yc(e){const n={};function t(i){if(n[i]!==void 0)return n[i];const o=e.getExtension(i);return n[i]=o,o}return{has:function(i){return t(i)!==null},init:function(){t("EXT_color_buffer_float"),t("WEBGL_clip_cull_distance"),t("OES_texture_float_linear"),t("EXT_color_buffer_half_float"),t("WEBGL_multisampled_render_to_texture"),t("WEBGL_render_shared_exponent")},get:function(i){const o=t(i);return o===null&&Ga("WebGLRenderer: "+i+" extension not supported."),o}}}function Kc(e,n,t,i){const o={},r=new WeakMap;function f(D){const h=D.target;h.index!==null&&n.remove(h.index);for(const S in h.attributes)n.remove(h.attributes[S]);h.removeEventListener("dispose",f),delete o[h.id];const x=r.get(h);x&&(n.remove(x),r.delete(h)),i.releaseStatesOfGeometry(h),h.isInstancedBufferGeometry===!0&&delete h._maxInstanceCount,t.memory.geometries--}function m(D,h){return o[h.id]===!0||(h.addEventListener("dispose",f),o[h.id]=!0,t.memory.geometries++),h}function P(D){const h=D.attributes;for(const x in h)n.update(h[x],e.ARRAY_BUFFER)}function A(D){const h=[],x=D.index,S=D.attributes.position;let I=0;if(S===void 0)return;if(x!==null){const _=x.array;I=x.version;for(let T=0,v=_.length;T<v;T+=3){const y=_[T+0],C=_[T+1],U=_[T+2];h.push(y,C,C,U,U,y)}}else{const _=S.array;I=S.version;for(let T=0,v=_.length/3-1;T<v;T+=3){const y=T+0,C=T+1,U=T+2;h.push(y,C,C,U,U,y)}}const c=new(S.count>=65535?Do:Lo)(h,1);c.version=I;const s=r.get(D);s&&n.remove(s),r.set(D,c)}function G(D){const h=r.get(D);if(h){const x=D.index;x!==null&&h.version<x.version&&A(D)}else A(D);return r.get(D)}return{get:m,update:P,getWireframeAttribute:G}}function qc(e,n,t){let i;function o(h){i=h}let r,f;function m(h){r=h.type,f=h.bytesPerElement}function P(h,x){e.drawElements(i,x,r,h*f),t.update(x,i,1)}function A(h,x,S){S!==0&&(e.drawElementsInstanced(i,x,r,h*f,S),t.update(x,i,S))}function G(h,x,S){if(S===0)return;n.get("WEBGL_multi_draw").multiDrawElementsWEBGL(i,x,0,r,h,0,S);let c=0;for(let s=0;s<S;s++)c+=x[s];t.update(c,i,1)}function D(h,x,S,I){if(S===0)return;const c=n.get("WEBGL_multi_draw");if(c===null)for(let s=0;s<h.length;s++)A(h[s]/f,x[s],I[s]);else{c.multiDrawElementsInstancedWEBGL(i,x,0,r,h,0,I,0,S);let s=0;for(let _=0;_<S;_++)s+=x[_]*I[_];t.update(s,i,1)}}this.setMode=o,this.setIndex=m,this.render=P,this.renderInstances=A,this.renderMultiDraw=G,this.renderMultiDrawInstances=D}function Zc(e){const n={geometries:0,textures:0},t={frame:0,calls:0,triangles:0,points:0,lines:0};function i(r,f,m){switch(t.calls++,f){case e.TRIANGLES:t.triangles+=m*(r/3);break;case e.LINES:t.lines+=m*(r/2);break;case e.LINE_STRIP:t.lines+=m*(r-1);break;case e.LINE_LOOP:t.lines+=m*r;break;case e.POINTS:t.points+=m*r;break;default:rt("WebGLInfo: Unknown draw mode:",f);break}}function o(){t.calls=0,t.triangles=0,t.points=0,t.lines=0}return{memory:n,render:t,programs:null,autoReset:!0,reset:o,update:i}}function $c(e,n,t){const i=new WeakMap,o=new gt;function r(f,m,P){const A=f.morphTargetInfluences,G=m.morphAttributes.position||m.morphAttributes.normal||m.morphAttributes.color,D=G!==void 0?G.length:0;let h=i.get(m);if(h===void 0||h.count!==D){let p=function(){U.dispose(),i.delete(m),m.removeEventListener("dispose",p)};h!==void 0&&h.texture.dispose();const x=m.morphAttributes.position!==void 0,S=m.morphAttributes.normal!==void 0,I=m.morphAttributes.color!==void 0,c=m.morphAttributes.position||[],s=m.morphAttributes.normal||[],_=m.morphAttributes.color||[];let T=0;x===!0&&(T=1),S===!0&&(T=2),I===!0&&(T=3);let v=m.attributes.position.count*T,y=1;v>n.maxTextureSize&&(y=Math.ceil(v/n.maxTextureSize),v=n.maxTextureSize);const C=new Float32Array(v*y*4*D),U=new ja(C,v,y,D);U.type=Ot,U.needsUpdate=!0;const d=T*4;for(let $=0;$<D;$++){const R=c[$],H=s[$],V=_[$],z=v*y*4*$;for(let K=0;K<R.count;K++){const N=K*d;x===!0&&(o.fromBufferAttribute(R,K),C[z+N+0]=o.x,C[z+N+1]=o.y,C[z+N+2]=o.z,C[z+N+3]=0),S===!0&&(o.fromBufferAttribute(H,K),C[z+N+4]=o.x,C[z+N+5]=o.y,C[z+N+6]=o.z,C[z+N+7]=0),I===!0&&(o.fromBufferAttribute(V,K),C[z+N+8]=o.x,C[z+N+9]=o.y,C[z+N+10]=o.z,C[z+N+11]=V.itemSize===4?o.w:1)}}h={count:D,texture:U,size:new at(v,y)},i.set(m,h),m.addEventListener("dispose",p)}if(f.isInstancedMesh===!0&&f.morphTexture!==null)P.getUniforms().setValue(e,"morphTexture",f.morphTexture,t);else{let x=0;for(let I=0;I<A.length;I++)x+=A[I];const S=m.morphTargetsRelative?1:1-x;P.getUniforms().setValue(e,"morphTargetBaseInfluence",S),P.getUniforms().setValue(e,"morphTargetInfluences",A)}P.getUniforms().setValue(e,"morphTargetsTexture",h.texture,t),P.getUniforms().setValue(e,"morphTargetsTextureSize",h.size)}return{update:r}}function jc(e,n,t,i,o){let r=new WeakMap;function f(A){const G=o.render.frame,D=A.geometry,h=n.get(A,D);if(r.get(h)!==G&&(n.update(h),r.set(h,G)),A.isInstancedMesh&&(A.hasEventListener("dispose",P)===!1&&A.addEventListener("dispose",P),r.get(A)!==G&&(t.update(A.instanceMatrix,e.ARRAY_BUFFER),A.instanceColor!==null&&t.update(A.instanceColor,e.ARRAY_BUFFER),r.set(A,G))),A.isSkinnedMesh){const x=A.skeleton;r.get(x)!==G&&(x.update(),r.set(x,G))}return h}function m(){r=new WeakMap}function P(A){const G=A.target;G.removeEventListener("dispose",P),i.releaseStatesOfObject(G),t.remove(G.instanceMatrix),G.instanceColor!==null&&t.remove(G.instanceColor)}return{update:f,dispose:m}}const Qc={[sr]:"LINEAR_TONE_MAPPING",[or]:"REINHARD_TONE_MAPPING",[rr]:"CINEON_TONE_MAPPING",[ar]:"ACES_FILMIC_TONE_MAPPING",[ir]:"AGX_TONE_MAPPING",[nr]:"NEUTRAL_TONE_MAPPING",[tr]:"CUSTOM_TONE_MAPPING"};function Jc(e,n,t,i,o){const r=new Dt(n,t,{type:e,depthBuffer:i,stencilBuffer:o}),f=new Dt(n,t,{type:Gt,depthBuffer:!1,stencilBuffer:!1}),m=new nn;m.setAttribute("position",new Dn([-1,3,0,-1,-1,0,3,-1,0],3)),m.setAttribute("uv",new Dn([0,2,0,0,2,0],2));const P=new Cr({uniforms:{tDiffuse:{value:null}},vertexShader:`
			precision highp float;

			uniform mat4 modelViewMatrix;
			uniform mat4 projectionMatrix;

			attribute vec3 position;
			attribute vec2 uv;

			varying vec2 vUv;

			void main() {
				vUv = uv;
				gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
			}`,fragmentShader:`
			precision highp float;

			uniform sampler2D tDiffuse;

			varying vec2 vUv;

			#include <tonemapping_pars_fragment>
			#include <colorspace_pars_fragment>

			void main() {
				gl_FragColor = texture2D( tDiffuse, vUv );

				#ifdef LINEAR_TONE_MAPPING
					gl_FragColor.rgb = LinearToneMapping( gl_FragColor.rgb );
				#elif defined( REINHARD_TONE_MAPPING )
					gl_FragColor.rgb = ReinhardToneMapping( gl_FragColor.rgb );
				#elif defined( CINEON_TONE_MAPPING )
					gl_FragColor.rgb = CineonToneMapping( gl_FragColor.rgb );
				#elif defined( ACES_FILMIC_TONE_MAPPING )
					gl_FragColor.rgb = ACESFilmicToneMapping( gl_FragColor.rgb );
				#elif defined( AGX_TONE_MAPPING )
					gl_FragColor.rgb = AgXToneMapping( gl_FragColor.rgb );
				#elif defined( NEUTRAL_TONE_MAPPING )
					gl_FragColor.rgb = NeutralToneMapping( gl_FragColor.rgb );
				#elif defined( CUSTOM_TONE_MAPPING )
					gl_FragColor.rgb = CustomToneMapping( gl_FragColor.rgb );
				#endif

				#ifdef SRGB_TRANSFER
					gl_FragColor = sRGBTransferOETF( gl_FragColor );
				#endif
			}`,depthTest:!1,depthWrite:!1}),A=new vt(m,P),G=new Ha(-1,1,1,-1,0,1);let D=null,h=null,x=!1,S,I=null,c=[],s=!1;this.setSize=function(_,T){r.setSize(_,T),f.setSize(_,T);for(let v=0;v<c.length;v++){const y=c[v];y.setSize&&y.setSize(_,T)}},this.setEffects=function(_){c=_,s=c.length>0&&c[0].isRenderPass===!0;const T=r.width,v=r.height;for(let y=0;y<c.length;y++){const C=c[y];C.setSize&&C.setSize(T,v)}},this.begin=function(_,T){if(x||_.toneMapping===Pt&&c.length===0)return!1;if(I=T,T!==null){const v=T.width,y=T.height;(r.width!==v||r.height!==y)&&this.setSize(v,y)}return s===!1&&_.setRenderTarget(r),S=_.toneMapping,_.toneMapping=Pt,!0},this.hasRenderPass=function(){return s},this.end=function(_,T){_.toneMapping=S,x=!0;let v=r,y=f;for(let C=0;C<c.length;C++){const U=c[C];if(U.enabled!==!1&&(U.render(_,y,v,T),U.needsSwap!==!1)){const d=v;v=y,y=d}}if(D!==_.outputColorSpace||h!==_.toneMapping){D=_.outputColorSpace,h=_.toneMapping,P.defines={},lt.getTransfer(D)===it&&(P.defines.SRGB_TRANSFER="");const C=Qc[h];C&&(P.defines[C]=""),P.needsUpdate=!0}P.uniforms.tDiffuse.value=v.texture,_.setRenderTarget(I),_.render(A,G),I=null,x=!1},this.isCompositing=function(){return x},this.dispose=function(){r.dispose(),f.dispose(),m.dispose(),P.dispose()}}const dr=new Oo,ri=new Ln(1,1),ur=new ja,pr=new Uo,hr=new er,va=[],Sa=[],Ea=new Float32Array(16),xa=new Float32Array(9),Ma=new Float32Array(4);function on(e,n,t){const i=e[0];if(i<=0||i>0)return e;const o=n*t;let r=va[o];if(r===void 0&&(r=new Float32Array(o),va[o]=r),n!==0){i.toArray(r,0);for(let f=1,m=0;f!==n;++f)m+=t,e[f].toArray(r,m)}return r}function ft(e,n){if(e.length!==n.length)return!1;for(let t=0,i=e.length;t<i;t++)if(e[t]!==n[t])return!1;return!0}function dt(e,n){for(let t=0,i=n.length;t<i;t++)e[t]=n[t]}function Nn(e,n){let t=Sa[n];t===void 0&&(t=new Int32Array(n),Sa[n]=t);for(let i=0;i!==n;++i)t[i]=e.allocateTextureUnit();return t}function ef(e,n){const t=this.cache;t[0]!==n&&(e.uniform1f(this.addr,n),t[0]=n)}function tf(e,n){const t=this.cache;if(n.x!==void 0)(t[0]!==n.x||t[1]!==n.y)&&(e.uniform2f(this.addr,n.x,n.y),t[0]=n.x,t[1]=n.y);else{if(ft(t,n))return;e.uniform2fv(this.addr,n),dt(t,n)}}function nf(e,n){const t=this.cache;if(n.x!==void 0)(t[0]!==n.x||t[1]!==n.y||t[2]!==n.z)&&(e.uniform3f(this.addr,n.x,n.y,n.z),t[0]=n.x,t[1]=n.y,t[2]=n.z);else if(n.r!==void 0)(t[0]!==n.r||t[1]!==n.g||t[2]!==n.b)&&(e.uniform3f(this.addr,n.r,n.g,n.b),t[0]=n.r,t[1]=n.g,t[2]=n.b);else{if(ft(t,n))return;e.uniform3fv(this.addr,n),dt(t,n)}}function af(e,n){const t=this.cache;if(n.x!==void 0)(t[0]!==n.x||t[1]!==n.y||t[2]!==n.z||t[3]!==n.w)&&(e.uniform4f(this.addr,n.x,n.y,n.z,n.w),t[0]=n.x,t[1]=n.y,t[2]=n.z,t[3]=n.w);else{if(ft(t,n))return;e.uniform4fv(this.addr,n),dt(t,n)}}function rf(e,n){const t=this.cache,i=n.elements;if(i===void 0){if(ft(t,n))return;e.uniformMatrix2fv(this.addr,!1,n),dt(t,n)}else{if(ft(t,i))return;Ma.set(i),e.uniformMatrix2fv(this.addr,!1,Ma),dt(t,i)}}function of(e,n){const t=this.cache,i=n.elements;if(i===void 0){if(ft(t,n))return;e.uniformMatrix3fv(this.addr,!1,n),dt(t,n)}else{if(ft(t,i))return;xa.set(i),e.uniformMatrix3fv(this.addr,!1,xa),dt(t,i)}}function sf(e,n){const t=this.cache,i=n.elements;if(i===void 0){if(ft(t,n))return;e.uniformMatrix4fv(this.addr,!1,n),dt(t,n)}else{if(ft(t,i))return;Ea.set(i),e.uniformMatrix4fv(this.addr,!1,Ea),dt(t,i)}}function lf(e,n){const t=this.cache;t[0]!==n&&(e.uniform1i(this.addr,n),t[0]=n)}function cf(e,n){const t=this.cache;if(n.x!==void 0)(t[0]!==n.x||t[1]!==n.y)&&(e.uniform2i(this.addr,n.x,n.y),t[0]=n.x,t[1]=n.y);else{if(ft(t,n))return;e.uniform2iv(this.addr,n),dt(t,n)}}function ff(e,n){const t=this.cache;if(n.x!==void 0)(t[0]!==n.x||t[1]!==n.y||t[2]!==n.z)&&(e.uniform3i(this.addr,n.x,n.y,n.z),t[0]=n.x,t[1]=n.y,t[2]=n.z);else{if(ft(t,n))return;e.uniform3iv(this.addr,n),dt(t,n)}}function df(e,n){const t=this.cache;if(n.x!==void 0)(t[0]!==n.x||t[1]!==n.y||t[2]!==n.z||t[3]!==n.w)&&(e.uniform4i(this.addr,n.x,n.y,n.z,n.w),t[0]=n.x,t[1]=n.y,t[2]=n.z,t[3]=n.w);else{if(ft(t,n))return;e.uniform4iv(this.addr,n),dt(t,n)}}function uf(e,n){const t=this.cache;t[0]!==n&&(e.uniform1ui(this.addr,n),t[0]=n)}function pf(e,n){const t=this.cache;if(n.x!==void 0)(t[0]!==n.x||t[1]!==n.y)&&(e.uniform2ui(this.addr,n.x,n.y),t[0]=n.x,t[1]=n.y);else{if(ft(t,n))return;e.uniform2uiv(this.addr,n),dt(t,n)}}function hf(e,n){const t=this.cache;if(n.x!==void 0)(t[0]!==n.x||t[1]!==n.y||t[2]!==n.z)&&(e.uniform3ui(this.addr,n.x,n.y,n.z),t[0]=n.x,t[1]=n.y,t[2]=n.z);else{if(ft(t,n))return;e.uniform3uiv(this.addr,n),dt(t,n)}}function mf(e,n){const t=this.cache;if(n.x!==void 0)(t[0]!==n.x||t[1]!==n.y||t[2]!==n.z||t[3]!==n.w)&&(e.uniform4ui(this.addr,n.x,n.y,n.z,n.w),t[0]=n.x,t[1]=n.y,t[2]=n.z,t[3]=n.w);else{if(ft(t,n))return;e.uniform4uiv(this.addr,n),dt(t,n)}}function _f(e,n,t){const i=this.cache,o=t.allocateTextureUnit();i[0]!==o&&(e.uniform1i(this.addr,o),i[0]=o);let r;this.type===e.SAMPLER_2D_SHADOW?(ri.compareFunction=t.isReversedDepthBuffer()?si:li,r=ri):r=dr,t.setTexture2D(n||r,o)}function gf(e,n,t){const i=this.cache,o=t.allocateTextureUnit();i[0]!==o&&(e.uniform1i(this.addr,o),i[0]=o),t.setTexture3D(n||pr,o)}function vf(e,n,t){const i=this.cache,o=t.allocateTextureUnit();i[0]!==o&&(e.uniform1i(this.addr,o),i[0]=o),t.setTextureCube(n||hr,o)}function Sf(e,n,t){const i=this.cache,o=t.allocateTextureUnit();i[0]!==o&&(e.uniform1i(this.addr,o),i[0]=o),t.setTexture2DArray(n||ur,o)}function Ef(e){switch(e){case 5126:return ef;case 35664:return tf;case 35665:return nf;case 35666:return af;case 35674:return rf;case 35675:return of;case 35676:return sf;case 5124:case 35670:return lf;case 35667:case 35671:return cf;case 35668:case 35672:return ff;case 35669:case 35673:return df;case 5125:return uf;case 36294:return pf;case 36295:return hf;case 36296:return mf;case 35678:case 36198:case 36298:case 36306:case 35682:return _f;case 35679:case 36299:case 36307:return gf;case 35680:case 36300:case 36308:case 36293:return vf;case 36289:case 36303:case 36311:case 36292:return Sf}}function xf(e,n){e.uniform1fv(this.addr,n)}function Mf(e,n){const t=on(n,this.size,2);e.uniform2fv(this.addr,t)}function Tf(e,n){const t=on(n,this.size,3);e.uniform3fv(this.addr,t)}function Af(e,n){const t=on(n,this.size,4);e.uniform4fv(this.addr,t)}function Rf(e,n){const t=on(n,this.size,4);e.uniformMatrix2fv(this.addr,!1,t)}function bf(e,n){const t=on(n,this.size,9);e.uniformMatrix3fv(this.addr,!1,t)}function Cf(e,n){const t=on(n,this.size,16);e.uniformMatrix4fv(this.addr,!1,t)}function Pf(e,n){e.uniform1iv(this.addr,n)}function Df(e,n){e.uniform2iv(this.addr,n)}function Lf(e,n){e.uniform3iv(this.addr,n)}function wf(e,n){e.uniform4iv(this.addr,n)}function Uf(e,n){e.uniform1uiv(this.addr,n)}function If(e,n){e.uniform2uiv(this.addr,n)}function yf(e,n){e.uniform3uiv(this.addr,n)}function Nf(e,n){e.uniform4uiv(this.addr,n)}function Ff(e,n,t){const i=this.cache,o=n.length,r=Nn(t,o);ft(i,r)||(e.uniform1iv(this.addr,r),dt(i,r));let f;this.type===e.SAMPLER_2D_SHADOW?f=ri:f=dr;for(let m=0;m!==o;++m)t.setTexture2D(n[m]||f,r[m])}function Of(e,n,t){const i=this.cache,o=n.length,r=Nn(t,o);ft(i,r)||(e.uniform1iv(this.addr,r),dt(i,r));for(let f=0;f!==o;++f)t.setTexture3D(n[f]||pr,r[f])}function Bf(e,n,t){const i=this.cache,o=n.length,r=Nn(t,o);ft(i,r)||(e.uniform1iv(this.addr,r),dt(i,r));for(let f=0;f!==o;++f)t.setTextureCube(n[f]||hr,r[f])}function Gf(e,n,t){const i=this.cache,o=n.length,r=Nn(t,o);ft(i,r)||(e.uniform1iv(this.addr,r),dt(i,r));for(let f=0;f!==o;++f)t.setTexture2DArray(n[f]||ur,r[f])}function Hf(e){switch(e){case 5126:return xf;case 35664:return Mf;case 35665:return Tf;case 35666:return Af;case 35674:return Rf;case 35675:return bf;case 35676:return Cf;case 5124:case 35670:return Pf;case 35667:case 35671:return Df;case 35668:case 35672:return Lf;case 35669:case 35673:return wf;case 5125:return Uf;case 36294:return If;case 36295:return yf;case 36296:return Nf;case 35678:case 36198:case 36298:case 36306:case 35682:return Ff;case 35679:case 36299:case 36307:return Of;case 35680:case 36300:case 36308:case 36293:return Bf;case 36289:case 36303:case 36311:case 36292:return Gf}}class Vf{constructor(n,t,i){this.id=n,this.addr=i,this.cache=[],this.type=t.type,this.setValue=Ef(t.type)}}class kf{constructor(n,t,i){this.id=n,this.addr=i,this.cache=[],this.type=t.type,this.size=t.size,this.setValue=Hf(t.type)}}class Wf{constructor(n){this.id=n,this.seq=[],this.map={}}setValue(n,t,i){const o=this.seq;for(let r=0,f=o.length;r!==f;++r){const m=o[r];m.setValue(n,t[m.id],i)}}}const ei=/(\w+)(\])?(\[|\.)?/g;function Ta(e,n){e.seq.push(n),e.map[n.id]=n}function zf(e,n,t){const i=e.name,o=i.length;for(ei.lastIndex=0;;){const r=ei.exec(i),f=ei.lastIndex;let m=r[1];const P=r[2]==="]",A=r[3];if(P&&(m=m|0),A===void 0||A==="["&&f+2===o){Ta(t,A===void 0?new Vf(m,e,n):new kf(m,e,n));break}else{let D=t.map[m];D===void 0&&(D=new Wf(m),Ta(t,D)),t=D}}}class Pn{constructor(n,t){this.seq=[],this.map={};const i=n.getProgramParameter(t,n.ACTIVE_UNIFORMS);for(let f=0;f<i;++f){const m=n.getActiveUniform(t,f),P=n.getUniformLocation(t,m.name);zf(m,P,this)}const o=[],r=[];for(const f of this.seq)f.type===n.SAMPLER_2D_SHADOW||f.type===n.SAMPLER_CUBE_SHADOW||f.type===n.SAMPLER_2D_ARRAY_SHADOW?o.push(f):r.push(f);o.length>0&&(this.seq=o.concat(r))}setValue(n,t,i,o){const r=this.map[t];r!==void 0&&r.setValue(n,i,o)}setOptional(n,t,i){const o=t[i];o!==void 0&&this.setValue(n,i,o)}static upload(n,t,i,o){for(let r=0,f=t.length;r!==f;++r){const m=t[r],P=i[m.id];P.needsUpdate!==!1&&m.setValue(n,P.value,o)}}static seqWithValue(n,t){const i=[];for(let o=0,r=n.length;o!==r;++o){const f=n[o];f.id in t&&i.push(f)}return i}}function Aa(e,n,t){const i=e.createShader(n);return e.shaderSource(i,t),e.compileShader(i),i}const Xf=37297;let Yf=0;function Kf(e,n){const t=e.split(`
`),i=[],o=Math.max(n-6,0),r=Math.min(n+6,t.length);for(let f=o;f<r;f++){const m=f+1;i.push(`${m===n?">":" "} ${m}: ${t[f]}`)}return i.join(`
`)}const Ra=new ze;function qf(e){lt._getMatrix(Ra,lt.workingColorSpace,e);const n=`mat3( ${Ra.elements.map(t=>t.toFixed(4))} )`;switch(lt.getTransfer(e)){case lr:return[n,"LinearTransferOETF"];case it:return[n,"sRGBTransferOETF"];default:return tt("WebGLProgram: Unsupported color space: ",e),[n,"LinearTransferOETF"]}}function ba(e,n,t){const i=e.getShaderParameter(n,e.COMPILE_STATUS),r=(e.getShaderInfoLog(n)||"").trim();if(i&&r==="")return"";const f=/ERROR: 0:(\d+)/.exec(r);if(f){const m=parseInt(f[1]);return t.toUpperCase()+`

`+r+`

`+Kf(e.getShaderSource(n),m)}else return r}function Zf(e,n){const t=qf(n);return[`vec4 ${e}( vec4 value ) {`,`	return ${t[1]}( vec4( value.rgb * ${t[0]}, value.a ) );`,"}"].join(`
`)}const $f={[sr]:"Linear",[or]:"Reinhard",[rr]:"Cineon",[ar]:"ACESFilmic",[ir]:"AgX",[nr]:"Neutral",[tr]:"Custom"};function jf(e,n){const t=$f[n];return t===void 0?(tt("WebGLProgram: Unsupported toneMapping:",n),"vec3 "+e+"( vec3 color ) { return LinearToneMapping( color ); }"):"vec3 "+e+"( vec3 color ) { return "+t+"ToneMapping( color ); }"}const xn=new Ue;function Qf(){lt.getLuminanceCoefficients(xn);const e=xn.x.toFixed(4),n=xn.y.toFixed(4),t=xn.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${e}, ${n}, ${t} );`,"	return dot( weights, rgb );","}"].join(`
`)}function Jf(e){return[e.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",e.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(dn).join(`
`)}function ed(e){const n=[];for(const t in e){const i=e[t];i!==!1&&n.push("#define "+t+" "+i)}return n.join(`
`)}function td(e,n){const t={},i=e.getProgramParameter(n,e.ACTIVE_ATTRIBUTES);for(let o=0;o<i;o++){const r=e.getActiveAttrib(n,o),f=r.name;let m=1;r.type===e.FLOAT_MAT2&&(m=2),r.type===e.FLOAT_MAT3&&(m=3),r.type===e.FLOAT_MAT4&&(m=4),t[f]={type:r.type,location:e.getAttribLocation(n,f),locationSize:m}}return t}function dn(e){return e!==""}function Ca(e,n){const t=n.numSpotLightShadows+n.numSpotLightMaps-n.numSpotLightShadowsWithMaps;return e.replace(/NUM_DIR_LIGHTS/g,n.numDirLights).replace(/NUM_SPOT_LIGHTS/g,n.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,n.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,t).replace(/NUM_RECT_AREA_LIGHTS/g,n.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,n.numPointLights).replace(/NUM_HEMI_LIGHTS/g,n.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,n.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,n.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,n.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,n.numPointLightShadows)}function Pa(e,n){return e.replace(/NUM_CLIPPING_PLANES/g,n.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,n.numClippingPlanes-n.numClipIntersection)}const nd=/^[ \t]*#include +<([\w\d./]+)>/gm;function oi(e){return e.replace(nd,ad)}const id=new Map;function ad(e,n){let t=Oe[n];if(t===void 0){const i=id.get(n);if(i!==void 0)t=Oe[i],tt('WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',n,i);else throw new Error("Can not resolve #include <"+n+">")}return oi(t)}const rd=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function Da(e){return e.replace(rd,od)}function od(e,n,t,i){let o="";for(let r=parseInt(n);r<parseInt(t);r++)o+=i.replace(/\[\s*i\s*\]/g,"[ "+r+" ]").replace(/UNROLLED_LOOP_INDEX/g,r);return o}function La(e){let n=`precision ${e.precision} float;
	precision ${e.precision} int;
	precision ${e.precision} sampler2D;
	precision ${e.precision} samplerCube;
	precision ${e.precision} sampler3D;
	precision ${e.precision} sampler2DArray;
	precision ${e.precision} sampler2DShadow;
	precision ${e.precision} samplerCubeShadow;
	precision ${e.precision} sampler2DArrayShadow;
	precision ${e.precision} isampler2D;
	precision ${e.precision} isampler3D;
	precision ${e.precision} isamplerCube;
	precision ${e.precision} isampler2DArray;
	precision ${e.precision} usampler2D;
	precision ${e.precision} usampler3D;
	precision ${e.precision} usamplerCube;
	precision ${e.precision} usampler2DArray;
	`;return e.precision==="highp"?n+=`
#define HIGH_PRECISION`:e.precision==="mediump"?n+=`
#define MEDIUM_PRECISION`:e.precision==="lowp"&&(n+=`
#define LOW_PRECISION`),n}const sd={[Rn]:"SHADOWMAP_TYPE_PCF",[fn]:"SHADOWMAP_TYPE_VSM"};function ld(e){return sd[e.shadowMapType]||"SHADOWMAP_TYPE_BASIC"}const cd={[_n]:"ENVMAP_TYPE_CUBE",[rn]:"ENVMAP_TYPE_CUBE",[In]:"ENVMAP_TYPE_CUBE_UV"};function fd(e){return e.envMap===!1?"ENVMAP_TYPE_CUBE":cd[e.envMapMode]||"ENVMAP_TYPE_CUBE"}const dd={[rn]:"ENVMAP_MODE_REFRACTION"};function ud(e){return e.envMap===!1?"ENVMAP_MODE_REFLECTION":dd[e.envMapMode]||"ENVMAP_MODE_REFLECTION"}const pd={[Fo]:"ENVMAP_BLENDING_MULTIPLY",[No]:"ENVMAP_BLENDING_MIX",[yo]:"ENVMAP_BLENDING_ADD"};function hd(e){return e.envMap===!1?"ENVMAP_BLENDING_NONE":pd[e.combine]||"ENVMAP_BLENDING_NONE"}function md(e){const n=e.envMapCubeUVHeight;if(n===null)return null;const t=Math.log2(n)-2,i=1/n;return{texelWidth:1/(3*Math.max(Math.pow(2,t),112)),texelHeight:i,maxMip:t}}function _d(e,n,t,i){const o=e.getContext(),r=t.defines;let f=t.vertexShader,m=t.fragmentShader;const P=ld(t),A=fd(t),G=ud(t),D=hd(t),h=md(t),x=Jf(t),S=ed(r),I=o.createProgram();let c,s,_=t.glslVersion?"#version "+t.glslVersion+`
`:"";t.isRawShaderMaterial?(c=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,S].filter(dn).join(`
`),c.length>0&&(c+=`
`),s=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,S].filter(dn).join(`
`),s.length>0&&(s+=`
`)):(c=[La(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,S,t.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",t.batching?"#define USE_BATCHING":"",t.batchingColor?"#define USE_BATCHING_COLOR":"",t.instancing?"#define USE_INSTANCING":"",t.instancingColor?"#define USE_INSTANCING_COLOR":"",t.instancingMorph?"#define USE_INSTANCING_MORPH":"",t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.map?"#define USE_MAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+G:"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.displacementMap?"#define USE_DISPLACEMENTMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.mapUv?"#define MAP_UV "+t.mapUv:"",t.alphaMapUv?"#define ALPHAMAP_UV "+t.alphaMapUv:"",t.lightMapUv?"#define LIGHTMAP_UV "+t.lightMapUv:"",t.aoMapUv?"#define AOMAP_UV "+t.aoMapUv:"",t.emissiveMapUv?"#define EMISSIVEMAP_UV "+t.emissiveMapUv:"",t.bumpMapUv?"#define BUMPMAP_UV "+t.bumpMapUv:"",t.normalMapUv?"#define NORMALMAP_UV "+t.normalMapUv:"",t.displacementMapUv?"#define DISPLACEMENTMAP_UV "+t.displacementMapUv:"",t.metalnessMapUv?"#define METALNESSMAP_UV "+t.metalnessMapUv:"",t.roughnessMapUv?"#define ROUGHNESSMAP_UV "+t.roughnessMapUv:"",t.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+t.anisotropyMapUv:"",t.clearcoatMapUv?"#define CLEARCOATMAP_UV "+t.clearcoatMapUv:"",t.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+t.clearcoatNormalMapUv:"",t.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+t.clearcoatRoughnessMapUv:"",t.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+t.iridescenceMapUv:"",t.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+t.iridescenceThicknessMapUv:"",t.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+t.sheenColorMapUv:"",t.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+t.sheenRoughnessMapUv:"",t.specularMapUv?"#define SPECULARMAP_UV "+t.specularMapUv:"",t.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+t.specularColorMapUv:"",t.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+t.specularIntensityMapUv:"",t.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+t.transmissionMapUv:"",t.thicknessMapUv?"#define THICKNESSMAP_UV "+t.thicknessMapUv:"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.flatShading?"#define FLAT_SHADED":"",t.skinning?"#define USE_SKINNING":"",t.morphTargets?"#define USE_MORPHTARGETS":"",t.morphNormals&&t.flatShading===!1?"#define USE_MORPHNORMALS":"",t.morphColors?"#define USE_MORPHCOLORS":"",t.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+t.morphTextureStride:"",t.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+t.morphTargetsCount:"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+P:"",t.sizeAttenuation?"#define USE_SIZEATTENUATION":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(dn).join(`
`),s=[La(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,S,t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",t.map?"#define USE_MAP":"",t.matcap?"#define USE_MATCAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+A:"",t.envMap?"#define "+G:"",t.envMap?"#define "+D:"",h?"#define CUBEUV_TEXEL_WIDTH "+h.texelWidth:"",h?"#define CUBEUV_TEXEL_HEIGHT "+h.texelHeight:"",h?"#define CUBEUV_MAX_MIP "+h.maxMip+".0":"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoat?"#define USE_CLEARCOAT":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.dispersion?"#define USE_DISPERSION":"",t.iridescence?"#define USE_IRIDESCENCE":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaTest?"#define USE_ALPHATEST":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.sheen?"#define USE_SHEEN":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors||t.instancingColor?"#define USE_COLOR":"",t.vertexAlphas||t.batchingColor?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.gradientMap?"#define USE_GRADIENTMAP":"",t.flatShading?"#define FLAT_SHADED":"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+P:"",t.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",t.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",t.toneMapping!==Pt?"#define TONE_MAPPING":"",t.toneMapping!==Pt?Oe.tonemapping_pars_fragment:"",t.toneMapping!==Pt?jf("toneMapping",t.toneMapping):"",t.dithering?"#define DITHERING":"",t.opaque?"#define OPAQUE":"",Oe.colorspace_pars_fragment,Zf("linearToOutputTexel",t.outputColorSpace),Qf(),t.useDepthPacking?"#define DEPTH_PACKING "+t.depthPacking:"",`
`].filter(dn).join(`
`)),f=oi(f),f=Ca(f,t),f=Pa(f,t),m=oi(m),m=Ca(m,t),m=Pa(m,t),f=Da(f),m=Da(m),t.isRawShaderMaterial!==!0&&(_=`#version 300 es
`,c=[x,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+c,s=["#define varying in",t.glslVersion===oa?"":"layout(location = 0) out highp vec4 pc_fragColor;",t.glslVersion===oa?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+s);const T=_+c+f,v=_+s+m,y=Aa(o,o.VERTEX_SHADER,T),C=Aa(o,o.FRAGMENT_SHADER,v);o.attachShader(I,y),o.attachShader(I,C),t.index0AttributeName!==void 0?o.bindAttribLocation(I,0,t.index0AttributeName):t.morphTargets===!0&&o.bindAttribLocation(I,0,"position"),o.linkProgram(I);function U(R){if(e.debug.checkShaderErrors){const H=o.getProgramInfoLog(I)||"",V=o.getShaderInfoLog(y)||"",z=o.getShaderInfoLog(C)||"",K=H.trim(),N=V.trim(),F=z.trim();let se=!0,Y=!0;if(o.getProgramParameter(I,o.LINK_STATUS)===!1)if(se=!1,typeof e.debug.onShaderError=="function")e.debug.onShaderError(o,I,y,C);else{const ae=ba(o,y,"vertex"),te=ba(o,C,"fragment");rt("THREE.WebGLProgram: Shader Error "+o.getError()+" - VALIDATE_STATUS "+o.getProgramParameter(I,o.VALIDATE_STATUS)+`

Material Name: `+R.name+`
Material Type: `+R.type+`

Program Info Log: `+K+`
`+ae+`
`+te)}else K!==""?tt("WebGLProgram: Program Info Log:",K):(N===""||F==="")&&(Y=!1);Y&&(R.diagnostics={runnable:se,programLog:K,vertexShader:{log:N,prefix:c},fragmentShader:{log:F,prefix:s}})}o.deleteShader(y),o.deleteShader(C),d=new Pn(o,I),p=td(o,I)}let d;this.getUniforms=function(){return d===void 0&&U(this),d};let p;this.getAttributes=function(){return p===void 0&&U(this),p};let $=t.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return $===!1&&($=o.getProgramParameter(I,Xf)),$},this.destroy=function(){i.releaseStatesOfProgram(this),o.deleteProgram(I),this.program=void 0},this.type=t.shaderType,this.name=t.shaderName,this.id=Yf++,this.cacheKey=n,this.usedTimes=1,this.program=I,this.vertexShader=y,this.fragmentShader=C,this}let gd=0;class vd{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(n){const t=n.vertexShader,i=n.fragmentShader,o=this._getShaderStage(t),r=this._getShaderStage(i),f=this._getShaderCacheForMaterial(n);return f.has(o)===!1&&(f.add(o),o.usedTimes++),f.has(r)===!1&&(f.add(r),r.usedTimes++),this}remove(n){const t=this.materialCache.get(n);for(const i of t)i.usedTimes--,i.usedTimes===0&&this.shaderCache.delete(i.code);return this.materialCache.delete(n),this}getVertexShaderID(n){return this._getShaderStage(n.vertexShader).id}getFragmentShaderID(n){return this._getShaderStage(n.fragmentShader).id}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(n){const t=this.materialCache;let i=t.get(n);return i===void 0&&(i=new Set,t.set(n,i)),i}_getShaderStage(n){const t=this.shaderCache;let i=t.get(n);return i===void 0&&(i=new Sd(n),t.set(n,i)),i}}class Sd{constructor(n){this.id=gd++,this.code=n,this.usedTimes=0}}function Ed(e,n,t,i,o,r){const f=new wo,m=new vd,P=new Set,A=[],G=new Map,D=i.logarithmicDepthBuffer;let h=i.precision;const x={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distance",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function S(d){return P.add(d),d===0?"uv":`uv${d}`}function I(d,p,$,R,H){const V=R.fog,z=H.geometry,K=d.isMeshStandardMaterial||d.isMeshLambertMaterial||d.isMeshPhongMaterial?R.environment:null,N=d.isMeshStandardMaterial||d.isMeshLambertMaterial&&!d.envMap||d.isMeshPhongMaterial&&!d.envMap,F=n.get(d.envMap||K,N),se=F&&F.mapping===In?F.image.height:null,Y=x[d.type];d.precision!==null&&(h=i.getMaxPrecision(d.precision),h!==d.precision&&tt("WebGLProgram.getParameters:",d.precision,"not supported, using",h,"instead."));const ae=z.morphAttributes.position||z.morphAttributes.normal||z.morphAttributes.color,te=ae!==void 0?ae.length:0;let j=0;z.morphAttributes.position!==void 0&&(j=1),z.morphAttributes.normal!==void 0&&(j=2),z.morphAttributes.color!==void 0&&(j=3);let de,Ce,me,B;if(Y){const qe=bt[Y];de=qe.vertexShader,Ce=qe.fragmentShader}else de=d.vertexShader,Ce=d.fragmentShader,m.update(d),me=m.getVertexShaderID(d),B=m.getFragmentShaderID(d);const q=e.getRenderTarget(),Q=e.state.buffers.depth.getReversed(),De=H.isInstancedMesh===!0,_e=H.isBatchedMesh===!0,Me=!!d.map,ke=!!d.matcap,Le=!!F,Fe=!!d.aoMap,He=!!d.lightMap,Ie=!!d.bumpMap,$e=!!d.normalMap,g=!!d.displacementMap,Ke=!!d.emissiveMap,Ve=!!d.metalnessMap,Ye=!!d.roughnessMap,Te=d.anisotropy>0,u=d.clearcoat>0,a=d.dispersion>0,M=d.iridescence>0,X=d.sheen>0,Z=d.transmission>0,W=Te&&!!d.anisotropyMap,ge=u&&!!d.clearcoatMap,re=u&&!!d.clearcoatNormalMap,Pe=u&&!!d.clearcoatRoughnessMap,we=M&&!!d.iridescenceMap,J=M&&!!d.iridescenceThicknessMap,ne=X&&!!d.sheenColorMap,ve=X&&!!d.sheenRoughnessMap,Ee=!!d.specularMap,ue=!!d.specularColorMap,Be=!!d.specularIntensityMap,E=Z&&!!d.transmissionMap,oe=Z&&!!d.thicknessMap,ie=!!d.gradientMap,he=!!d.alphaMap,ee=d.alphaTest>0,k=!!d.alphaHash,Se=!!d.extensions;let ye=Pt;d.toneMapped&&(q===null||q.isXRRenderTarget===!0)&&(ye=e.toneMapping);const nt={shaderID:Y,shaderType:d.type,shaderName:d.name,vertexShader:de,fragmentShader:Ce,defines:d.defines,customVertexShaderID:me,customFragmentShaderID:B,isRawShaderMaterial:d.isRawShaderMaterial===!0,glslVersion:d.glslVersion,precision:h,batching:_e,batchingColor:_e&&H._colorsTexture!==null,instancing:De,instancingColor:De&&H.instanceColor!==null,instancingMorph:De&&H.morphTexture!==null,outputColorSpace:q===null?e.outputColorSpace:q.isXRRenderTarget===!0?q.texture.colorSpace:Un,alphaToCoverage:!!d.alphaToCoverage,map:Me,matcap:ke,envMap:Le,envMapMode:Le&&F.mapping,envMapCubeUVHeight:se,aoMap:Fe,lightMap:He,bumpMap:Ie,normalMap:$e,displacementMap:g,emissiveMap:Ke,normalMapObjectSpace:$e&&d.normalMapType===Co,normalMapTangentSpace:$e&&d.normalMapType===bo,metalnessMap:Ve,roughnessMap:Ye,anisotropy:Te,anisotropyMap:W,clearcoat:u,clearcoatMap:ge,clearcoatNormalMap:re,clearcoatRoughnessMap:Pe,dispersion:a,iridescence:M,iridescenceMap:we,iridescenceThicknessMap:J,sheen:X,sheenColorMap:ne,sheenRoughnessMap:ve,specularMap:Ee,specularColorMap:ue,specularIntensityMap:Be,transmission:Z,transmissionMap:E,thicknessMap:oe,gradientMap:ie,opaque:d.transparent===!1&&d.blending===bn&&d.alphaToCoverage===!1,alphaMap:he,alphaTest:ee,alphaHash:k,combine:d.combine,mapUv:Me&&S(d.map.channel),aoMapUv:Fe&&S(d.aoMap.channel),lightMapUv:He&&S(d.lightMap.channel),bumpMapUv:Ie&&S(d.bumpMap.channel),normalMapUv:$e&&S(d.normalMap.channel),displacementMapUv:g&&S(d.displacementMap.channel),emissiveMapUv:Ke&&S(d.emissiveMap.channel),metalnessMapUv:Ve&&S(d.metalnessMap.channel),roughnessMapUv:Ye&&S(d.roughnessMap.channel),anisotropyMapUv:W&&S(d.anisotropyMap.channel),clearcoatMapUv:ge&&S(d.clearcoatMap.channel),clearcoatNormalMapUv:re&&S(d.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:Pe&&S(d.clearcoatRoughnessMap.channel),iridescenceMapUv:we&&S(d.iridescenceMap.channel),iridescenceThicknessMapUv:J&&S(d.iridescenceThicknessMap.channel),sheenColorMapUv:ne&&S(d.sheenColorMap.channel),sheenRoughnessMapUv:ve&&S(d.sheenRoughnessMap.channel),specularMapUv:Ee&&S(d.specularMap.channel),specularColorMapUv:ue&&S(d.specularColorMap.channel),specularIntensityMapUv:Be&&S(d.specularIntensityMap.channel),transmissionMapUv:E&&S(d.transmissionMap.channel),thicknessMapUv:oe&&S(d.thicknessMap.channel),alphaMapUv:he&&S(d.alphaMap.channel),vertexTangents:!!z.attributes.tangent&&($e||Te),vertexColors:d.vertexColors,vertexAlphas:d.vertexColors===!0&&!!z.attributes.color&&z.attributes.color.itemSize===4,pointsUvs:H.isPoints===!0&&!!z.attributes.uv&&(Me||he),fog:!!V,useFog:d.fog===!0,fogExp2:!!V&&V.isFogExp2,flatShading:d.wireframe===!1&&(d.flatShading===!0||z.attributes.normal===void 0&&$e===!1&&(d.isMeshLambertMaterial||d.isMeshPhongMaterial||d.isMeshStandardMaterial||d.isMeshPhysicalMaterial)),sizeAttenuation:d.sizeAttenuation===!0,logarithmicDepthBuffer:D,reversedDepthBuffer:Q,skinning:H.isSkinnedMesh===!0,morphTargets:z.morphAttributes.position!==void 0,morphNormals:z.morphAttributes.normal!==void 0,morphColors:z.morphAttributes.color!==void 0,morphTargetsCount:te,morphTextureStride:j,numDirLights:p.directional.length,numPointLights:p.point.length,numSpotLights:p.spot.length,numSpotLightMaps:p.spotLightMap.length,numRectAreaLights:p.rectArea.length,numHemiLights:p.hemi.length,numDirLightShadows:p.directionalShadowMap.length,numPointLightShadows:p.pointShadowMap.length,numSpotLightShadows:p.spotShadowMap.length,numSpotLightShadowsWithMaps:p.numSpotLightShadowsWithMaps,numLightProbes:p.numLightProbes,numClippingPlanes:r.numPlanes,numClipIntersection:r.numIntersection,dithering:d.dithering,shadowMapEnabled:e.shadowMap.enabled&&$.length>0,shadowMapType:e.shadowMap.type,toneMapping:ye,decodeVideoTexture:Me&&d.map.isVideoTexture===!0&&lt.getTransfer(d.map.colorSpace)===it,decodeVideoTextureEmissive:Ke&&d.emissiveMap.isVideoTexture===!0&&lt.getTransfer(d.emissiveMap.colorSpace)===it,premultipliedAlpha:d.premultipliedAlpha,doubleSided:d.side===Et,flipSided:d.side===Mt,useDepthPacking:d.depthPacking>=0,depthPacking:d.depthPacking||0,index0AttributeName:d.index0AttributeName,extensionClipCullDistance:Se&&d.extensions.clipCullDistance===!0&&t.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(Se&&d.extensions.multiDraw===!0||_e)&&t.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:t.has("KHR_parallel_shader_compile"),customProgramCacheKey:d.customProgramCacheKey()};return nt.vertexUv1s=P.has(1),nt.vertexUv2s=P.has(2),nt.vertexUv3s=P.has(3),P.clear(),nt}function c(d){const p=[];if(d.shaderID?p.push(d.shaderID):(p.push(d.customVertexShaderID),p.push(d.customFragmentShaderID)),d.defines!==void 0)for(const $ in d.defines)p.push($),p.push(d.defines[$]);return d.isRawShaderMaterial===!1&&(s(p,d),_(p,d),p.push(e.outputColorSpace)),p.push(d.customProgramCacheKey),p.join()}function s(d,p){d.push(p.precision),d.push(p.outputColorSpace),d.push(p.envMapMode),d.push(p.envMapCubeUVHeight),d.push(p.mapUv),d.push(p.alphaMapUv),d.push(p.lightMapUv),d.push(p.aoMapUv),d.push(p.bumpMapUv),d.push(p.normalMapUv),d.push(p.displacementMapUv),d.push(p.emissiveMapUv),d.push(p.metalnessMapUv),d.push(p.roughnessMapUv),d.push(p.anisotropyMapUv),d.push(p.clearcoatMapUv),d.push(p.clearcoatNormalMapUv),d.push(p.clearcoatRoughnessMapUv),d.push(p.iridescenceMapUv),d.push(p.iridescenceThicknessMapUv),d.push(p.sheenColorMapUv),d.push(p.sheenRoughnessMapUv),d.push(p.specularMapUv),d.push(p.specularColorMapUv),d.push(p.specularIntensityMapUv),d.push(p.transmissionMapUv),d.push(p.thicknessMapUv),d.push(p.combine),d.push(p.fogExp2),d.push(p.sizeAttenuation),d.push(p.morphTargetsCount),d.push(p.morphAttributeCount),d.push(p.numDirLights),d.push(p.numPointLights),d.push(p.numSpotLights),d.push(p.numSpotLightMaps),d.push(p.numHemiLights),d.push(p.numRectAreaLights),d.push(p.numDirLightShadows),d.push(p.numPointLightShadows),d.push(p.numSpotLightShadows),d.push(p.numSpotLightShadowsWithMaps),d.push(p.numLightProbes),d.push(p.shadowMapType),d.push(p.toneMapping),d.push(p.numClippingPlanes),d.push(p.numClipIntersection),d.push(p.depthPacking)}function _(d,p){f.disableAll(),p.instancing&&f.enable(0),p.instancingColor&&f.enable(1),p.instancingMorph&&f.enable(2),p.matcap&&f.enable(3),p.envMap&&f.enable(4),p.normalMapObjectSpace&&f.enable(5),p.normalMapTangentSpace&&f.enable(6),p.clearcoat&&f.enable(7),p.iridescence&&f.enable(8),p.alphaTest&&f.enable(9),p.vertexColors&&f.enable(10),p.vertexAlphas&&f.enable(11),p.vertexUv1s&&f.enable(12),p.vertexUv2s&&f.enable(13),p.vertexUv3s&&f.enable(14),p.vertexTangents&&f.enable(15),p.anisotropy&&f.enable(16),p.alphaHash&&f.enable(17),p.batching&&f.enable(18),p.dispersion&&f.enable(19),p.batchingColor&&f.enable(20),p.gradientMap&&f.enable(21),d.push(f.mask),f.disableAll(),p.fog&&f.enable(0),p.useFog&&f.enable(1),p.flatShading&&f.enable(2),p.logarithmicDepthBuffer&&f.enable(3),p.reversedDepthBuffer&&f.enable(4),p.skinning&&f.enable(5),p.morphTargets&&f.enable(6),p.morphNormals&&f.enable(7),p.morphColors&&f.enable(8),p.premultipliedAlpha&&f.enable(9),p.shadowMapEnabled&&f.enable(10),p.doubleSided&&f.enable(11),p.flipSided&&f.enable(12),p.useDepthPacking&&f.enable(13),p.dithering&&f.enable(14),p.transmission&&f.enable(15),p.sheen&&f.enable(16),p.opaque&&f.enable(17),p.pointsUvs&&f.enable(18),p.decodeVideoTexture&&f.enable(19),p.decodeVideoTextureEmissive&&f.enable(20),p.alphaToCoverage&&f.enable(21),d.push(f.mask)}function T(d){const p=x[d.type];let $;if(p){const R=bt[p];$=Ro.clone(R.uniforms)}else $=d.uniforms;return $}function v(d,p){let $=G.get(p);return $!==void 0?++$.usedTimes:($=new _d(e,p,d,o),A.push($),G.set(p,$)),$}function y(d){if(--d.usedTimes===0){const p=A.indexOf(d);A[p]=A[A.length-1],A.pop(),G.delete(d.cacheKey),d.destroy()}}function C(d){m.remove(d)}function U(){m.dispose()}return{getParameters:I,getProgramCacheKey:c,getUniforms:T,acquireProgram:v,releaseProgram:y,releaseShaderCache:C,programs:A,dispose:U}}function xd(){let e=new WeakMap;function n(f){return e.has(f)}function t(f){let m=e.get(f);return m===void 0&&(m={},e.set(f,m)),m}function i(f){e.delete(f)}function o(f,m,P){e.get(f)[m]=P}function r(){e=new WeakMap}return{has:n,get:t,remove:i,update:o,dispose:r}}function Md(e,n){return e.groupOrder!==n.groupOrder?e.groupOrder-n.groupOrder:e.renderOrder!==n.renderOrder?e.renderOrder-n.renderOrder:e.material.id!==n.material.id?e.material.id-n.material.id:e.materialVariant!==n.materialVariant?e.materialVariant-n.materialVariant:e.z!==n.z?e.z-n.z:e.id-n.id}function wa(e,n){return e.groupOrder!==n.groupOrder?e.groupOrder-n.groupOrder:e.renderOrder!==n.renderOrder?e.renderOrder-n.renderOrder:e.z!==n.z?n.z-e.z:e.id-n.id}function Ua(){const e=[];let n=0;const t=[],i=[],o=[];function r(){n=0,t.length=0,i.length=0,o.length=0}function f(h){let x=0;return h.isInstancedMesh&&(x+=2),h.isSkinnedMesh&&(x+=1),x}function m(h,x,S,I,c,s){let _=e[n];return _===void 0?(_={id:h.id,object:h,geometry:x,material:S,materialVariant:f(h),groupOrder:I,renderOrder:h.renderOrder,z:c,group:s},e[n]=_):(_.id=h.id,_.object=h,_.geometry=x,_.material=S,_.materialVariant=f(h),_.groupOrder=I,_.renderOrder=h.renderOrder,_.z=c,_.group=s),n++,_}function P(h,x,S,I,c,s){const _=m(h,x,S,I,c,s);S.transmission>0?i.push(_):S.transparent===!0?o.push(_):t.push(_)}function A(h,x,S,I,c,s){const _=m(h,x,S,I,c,s);S.transmission>0?i.unshift(_):S.transparent===!0?o.unshift(_):t.unshift(_)}function G(h,x){t.length>1&&t.sort(h||Md),i.length>1&&i.sort(x||wa),o.length>1&&o.sort(x||wa)}function D(){for(let h=n,x=e.length;h<x;h++){const S=e[h];if(S.id===null)break;S.id=null,S.object=null,S.geometry=null,S.material=null,S.group=null}}return{opaque:t,transmissive:i,transparent:o,init:r,push:P,unshift:A,finish:D,sort:G}}function Td(){let e=new WeakMap;function n(i,o){const r=e.get(i);let f;return r===void 0?(f=new Ua,e.set(i,[f])):o>=r.length?(f=new Ua,r.push(f)):f=r[o],f}function t(){e=new WeakMap}return{get:n,dispose:t}}function Ad(){const e={};return{get:function(n){if(e[n.id]!==void 0)return e[n.id];let t;switch(n.type){case"DirectionalLight":t={direction:new Ue,color:new Xe};break;case"SpotLight":t={position:new Ue,direction:new Ue,color:new Xe,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":t={position:new Ue,color:new Xe,distance:0,decay:0};break;case"HemisphereLight":t={direction:new Ue,skyColor:new Xe,groundColor:new Xe};break;case"RectAreaLight":t={color:new Xe,position:new Ue,halfWidth:new Ue,halfHeight:new Ue};break}return e[n.id]=t,t}}}function Rd(){const e={};return{get:function(n){if(e[n.id]!==void 0)return e[n.id];let t;switch(n.type){case"DirectionalLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new at};break;case"SpotLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new at};break;case"PointLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new at,shadowCameraNear:1,shadowCameraFar:1e3};break}return e[n.id]=t,t}}}let bd=0;function Cd(e,n){return(n.castShadow?2:0)-(e.castShadow?2:0)+(n.map?1:0)-(e.map?1:0)}function Pd(e){const n=new Ad,t=Rd(),i={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let A=0;A<9;A++)i.probe.push(new Ue);const o=new Ue,r=new tn,f=new tn;function m(A){let G=0,D=0,h=0;for(let p=0;p<9;p++)i.probe[p].set(0,0,0);let x=0,S=0,I=0,c=0,s=0,_=0,T=0,v=0,y=0,C=0,U=0;A.sort(Cd);for(let p=0,$=A.length;p<$;p++){const R=A[p],H=R.color,V=R.intensity,z=R.distance;let K=null;if(R.shadow&&R.shadow.map&&(R.shadow.map.texture.format===mn?K=R.shadow.map.texture:K=R.shadow.map.depthTexture||R.shadow.map.texture),R.isAmbientLight)G+=H.r*V,D+=H.g*V,h+=H.b*V;else if(R.isLightProbe){for(let N=0;N<9;N++)i.probe[N].addScaledVector(R.sh.coefficients[N],V);U++}else if(R.isDirectionalLight){const N=n.get(R);if(N.color.copy(R.color).multiplyScalar(R.intensity),R.castShadow){const F=R.shadow,se=t.get(R);se.shadowIntensity=F.intensity,se.shadowBias=F.bias,se.shadowNormalBias=F.normalBias,se.shadowRadius=F.radius,se.shadowMapSize=F.mapSize,i.directionalShadow[x]=se,i.directionalShadowMap[x]=K,i.directionalShadowMatrix[x]=R.shadow.matrix,_++}i.directional[x]=N,x++}else if(R.isSpotLight){const N=n.get(R);N.position.setFromMatrixPosition(R.matrixWorld),N.color.copy(H).multiplyScalar(V),N.distance=z,N.coneCos=Math.cos(R.angle),N.penumbraCos=Math.cos(R.angle*(1-R.penumbra)),N.decay=R.decay,i.spot[I]=N;const F=R.shadow;if(R.map&&(i.spotLightMap[y]=R.map,y++,F.updateMatrices(R),R.castShadow&&C++),i.spotLightMatrix[I]=F.matrix,R.castShadow){const se=t.get(R);se.shadowIntensity=F.intensity,se.shadowBias=F.bias,se.shadowNormalBias=F.normalBias,se.shadowRadius=F.radius,se.shadowMapSize=F.mapSize,i.spotShadow[I]=se,i.spotShadowMap[I]=K,v++}I++}else if(R.isRectAreaLight){const N=n.get(R);N.color.copy(H).multiplyScalar(V),N.halfWidth.set(R.width*.5,0,0),N.halfHeight.set(0,R.height*.5,0),i.rectArea[c]=N,c++}else if(R.isPointLight){const N=n.get(R);if(N.color.copy(R.color).multiplyScalar(R.intensity),N.distance=R.distance,N.decay=R.decay,R.castShadow){const F=R.shadow,se=t.get(R);se.shadowIntensity=F.intensity,se.shadowBias=F.bias,se.shadowNormalBias=F.normalBias,se.shadowRadius=F.radius,se.shadowMapSize=F.mapSize,se.shadowCameraNear=F.camera.near,se.shadowCameraFar=F.camera.far,i.pointShadow[S]=se,i.pointShadowMap[S]=K,i.pointShadowMatrix[S]=R.shadow.matrix,T++}i.point[S]=N,S++}else if(R.isHemisphereLight){const N=n.get(R);N.skyColor.copy(R.color).multiplyScalar(V),N.groundColor.copy(R.groundColor).multiplyScalar(V),i.hemi[s]=N,s++}}c>0&&(e.has("OES_texture_float_linear")===!0?(i.rectAreaLTC1=le.LTC_FLOAT_1,i.rectAreaLTC2=le.LTC_FLOAT_2):(i.rectAreaLTC1=le.LTC_HALF_1,i.rectAreaLTC2=le.LTC_HALF_2)),i.ambient[0]=G,i.ambient[1]=D,i.ambient[2]=h;const d=i.hash;(d.directionalLength!==x||d.pointLength!==S||d.spotLength!==I||d.rectAreaLength!==c||d.hemiLength!==s||d.numDirectionalShadows!==_||d.numPointShadows!==T||d.numSpotShadows!==v||d.numSpotMaps!==y||d.numLightProbes!==U)&&(i.directional.length=x,i.spot.length=I,i.rectArea.length=c,i.point.length=S,i.hemi.length=s,i.directionalShadow.length=_,i.directionalShadowMap.length=_,i.pointShadow.length=T,i.pointShadowMap.length=T,i.spotShadow.length=v,i.spotShadowMap.length=v,i.directionalShadowMatrix.length=_,i.pointShadowMatrix.length=T,i.spotLightMatrix.length=v+y-C,i.spotLightMap.length=y,i.numSpotLightShadowsWithMaps=C,i.numLightProbes=U,d.directionalLength=x,d.pointLength=S,d.spotLength=I,d.rectAreaLength=c,d.hemiLength=s,d.numDirectionalShadows=_,d.numPointShadows=T,d.numSpotShadows=v,d.numSpotMaps=y,d.numLightProbes=U,i.version=bd++)}function P(A,G){let D=0,h=0,x=0,S=0,I=0;const c=G.matrixWorldInverse;for(let s=0,_=A.length;s<_;s++){const T=A[s];if(T.isDirectionalLight){const v=i.directional[D];v.direction.setFromMatrixPosition(T.matrixWorld),o.setFromMatrixPosition(T.target.matrixWorld),v.direction.sub(o),v.direction.transformDirection(c),D++}else if(T.isSpotLight){const v=i.spot[x];v.position.setFromMatrixPosition(T.matrixWorld),v.position.applyMatrix4(c),v.direction.setFromMatrixPosition(T.matrixWorld),o.setFromMatrixPosition(T.target.matrixWorld),v.direction.sub(o),v.direction.transformDirection(c),x++}else if(T.isRectAreaLight){const v=i.rectArea[S];v.position.setFromMatrixPosition(T.matrixWorld),v.position.applyMatrix4(c),f.identity(),r.copy(T.matrixWorld),r.premultiply(c),f.extractRotation(r),v.halfWidth.set(T.width*.5,0,0),v.halfHeight.set(0,T.height*.5,0),v.halfWidth.applyMatrix4(f),v.halfHeight.applyMatrix4(f),S++}else if(T.isPointLight){const v=i.point[h];v.position.setFromMatrixPosition(T.matrixWorld),v.position.applyMatrix4(c),h++}else if(T.isHemisphereLight){const v=i.hemi[I];v.direction.setFromMatrixPosition(T.matrixWorld),v.direction.transformDirection(c),I++}}}return{setup:m,setupView:P,state:i}}function Ia(e){const n=new Pd(e),t=[],i=[];function o(G){A.camera=G,t.length=0,i.length=0}function r(G){t.push(G)}function f(G){i.push(G)}function m(){n.setup(t)}function P(G){n.setupView(t,G)}const A={lightsArray:t,shadowsArray:i,camera:null,lights:n,transmissionRenderTarget:{}};return{init:o,state:A,setupLights:m,setupLightsView:P,pushLight:r,pushShadow:f}}function Dd(e){let n=new WeakMap;function t(o,r=0){const f=n.get(o);let m;return f===void 0?(m=new Ia(e),n.set(o,[m])):r>=f.length?(m=new Ia(e),f.push(m)):m=f[r],m}function i(){n=new WeakMap}return{get:t,dispose:i}}const Ld=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,wd=`uniform sampler2D shadow_pass;
uniform vec2 resolution;
uniform float radius;
void main() {
	const float samples = float( VSM_SAMPLES );
	float mean = 0.0;
	float squared_mean = 0.0;
	float uvStride = samples <= 1.0 ? 0.0 : 2.0 / ( samples - 1.0 );
	float uvStart = samples <= 1.0 ? 0.0 : - 1.0;
	for ( float i = 0.0; i < samples; i ++ ) {
		float uvOffset = uvStart + i * uvStride;
		#ifdef HORIZONTAL_PASS
			vec2 distribution = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( uvOffset, 0.0 ) * radius ) / resolution ).rg;
			mean += distribution.x;
			squared_mean += distribution.y * distribution.y + distribution.x * distribution.x;
		#else
			float depth = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( 0.0, uvOffset ) * radius ) / resolution ).r;
			mean += depth;
			squared_mean += depth * depth;
		#endif
	}
	mean = mean / samples;
	squared_mean = squared_mean / samples;
	float std_dev = sqrt( max( 0.0, squared_mean - mean * mean ) );
	gl_FragColor = vec4( mean, std_dev, 0.0, 1.0 );
}`,Ud=[new Ue(1,0,0),new Ue(-1,0,0),new Ue(0,1,0),new Ue(0,-1,0),new Ue(0,0,1),new Ue(0,0,-1)],Id=[new Ue(0,-1,0),new Ue(0,-1,0),new Ue(0,0,1),new Ue(0,0,-1),new Ue(0,-1,0),new Ue(0,-1,0)],ya=new tn,cn=new Ue,ti=new Ue;function yd(e,n,t){let i=new Ba;const o=new at,r=new at,f=new gt,m=new ao,P=new ro,A={},G=t.maxTextureSize,D={[pn]:Mt,[Mt]:pn,[Et]:Et},h=new yt({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new at},radius:{value:4}},vertexShader:Ld,fragmentShader:wd}),x=h.clone();x.defines.HORIZONTAL_PASS=1;const S=new nn;S.setAttribute("position",new An(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));const I=new vt(S,h),c=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=Rn;let s=this.type;this.render=function(C,U,d){if(c.enabled===!1||c.autoUpdate===!1&&c.needsUpdate===!1||C.length===0)return;this.type===ka&&(tt("WebGLShadowMap: PCFSoftShadowMap has been deprecated. Using PCFShadowMap instead."),this.type=Rn);const p=e.getRenderTarget(),$=e.getActiveCubeFace(),R=e.getActiveMipmapLevel(),H=e.state;H.setBlending(It),H.buffers.depth.getReversed()===!0?H.buffers.color.setClear(0,0,0,0):H.buffers.color.setClear(1,1,1,1),H.buffers.depth.setTest(!0),H.setScissorTest(!1);const V=s!==this.type;V&&U.traverse(function(z){z.material&&(Array.isArray(z.material)?z.material.forEach(K=>K.needsUpdate=!0):z.material.needsUpdate=!0)});for(let z=0,K=C.length;z<K;z++){const N=C[z],F=N.shadow;if(F===void 0){tt("WebGLShadowMap:",N,"has no shadow.");continue}if(F.autoUpdate===!1&&F.needsUpdate===!1)continue;o.copy(F.mapSize);const se=F.getFrameExtents();o.multiply(se),r.copy(F.mapSize),(o.x>G||o.y>G)&&(o.x>G&&(r.x=Math.floor(G/se.x),o.x=r.x*se.x,F.mapSize.x=r.x),o.y>G&&(r.y=Math.floor(G/se.y),o.y=r.y*se.y,F.mapSize.y=r.y));const Y=e.state.buffers.depth.getReversed();if(F.camera._reversedDepth=Y,F.map===null||V===!0){if(F.map!==null&&(F.map.depthTexture!==null&&(F.map.depthTexture.dispose(),F.map.depthTexture=null),F.map.dispose()),this.type===fn){if(N.isPointLight){tt("WebGLShadowMap: VSM shadow maps are not supported for PointLights. Use PCF or BasicShadowMap instead.");continue}F.map=new Dt(o.x,o.y,{format:mn,type:Gt,minFilter:xt,magFilter:xt,generateMipmaps:!1}),F.map.texture.name=N.name+".shadowMap",F.map.depthTexture=new Ln(o.x,o.y,Ot),F.map.depthTexture.name=N.name+".shadowMapDepth",F.map.depthTexture.format=an,F.map.depthTexture.compareFunction=null,F.map.depthTexture.minFilter=Xt,F.map.depthTexture.magFilter=Xt}else N.isPointLight?(F.map=new fr(o.x),F.map.depthTexture=new oo(o.x,Yt)):(F.map=new Dt(o.x,o.y),F.map.depthTexture=new Ln(o.x,o.y,Yt)),F.map.depthTexture.name=N.name+".shadowMap",F.map.depthTexture.format=an,this.type===Rn?(F.map.depthTexture.compareFunction=Y?si:li,F.map.depthTexture.minFilter=xt,F.map.depthTexture.magFilter=xt):(F.map.depthTexture.compareFunction=null,F.map.depthTexture.minFilter=Xt,F.map.depthTexture.magFilter=Xt);F.camera.updateProjectionMatrix()}const ae=F.map.isWebGLCubeRenderTarget?6:1;for(let te=0;te<ae;te++){if(F.map.isWebGLCubeRenderTarget)e.setRenderTarget(F.map,te),e.clear();else{te===0&&(e.setRenderTarget(F.map),e.clear());const j=F.getViewport(te);f.set(r.x*j.x,r.y*j.y,r.x*j.z,r.y*j.w),H.viewport(f)}if(N.isPointLight){const j=F.camera,de=F.matrix,Ce=N.distance||j.far;Ce!==j.far&&(j.far=Ce,j.updateProjectionMatrix()),cn.setFromMatrixPosition(N.matrixWorld),j.position.copy(cn),ti.copy(j.position),ti.add(Ud[te]),j.up.copy(Id[te]),j.lookAt(ti),j.updateMatrixWorld(),de.makeTranslation(-cn.x,-cn.y,-cn.z),ya.multiplyMatrices(j.projectionMatrix,j.matrixWorldInverse),F._frustum.setFromProjectionMatrix(ya,j.coordinateSystem,j.reversedDepth)}else F.updateMatrices(N);i=F.getFrustum(),v(U,d,F.camera,N,this.type)}F.isPointLightShadow!==!0&&this.type===fn&&_(F,d),F.needsUpdate=!1}s=this.type,c.needsUpdate=!1,e.setRenderTarget(p,$,R)};function _(C,U){const d=n.update(I);h.defines.VSM_SAMPLES!==C.blurSamples&&(h.defines.VSM_SAMPLES=C.blurSamples,x.defines.VSM_SAMPLES=C.blurSamples,h.needsUpdate=!0,x.needsUpdate=!0),C.mapPass===null&&(C.mapPass=new Dt(o.x,o.y,{format:mn,type:Gt})),h.uniforms.shadow_pass.value=C.map.depthTexture,h.uniforms.resolution.value=C.mapSize,h.uniforms.radius.value=C.radius,e.setRenderTarget(C.mapPass),e.clear(),e.renderBufferDirect(U,null,d,h,I,null),x.uniforms.shadow_pass.value=C.mapPass.texture,x.uniforms.resolution.value=C.mapSize,x.uniforms.radius.value=C.radius,e.setRenderTarget(C.map),e.clear(),e.renderBufferDirect(U,null,d,x,I,null)}function T(C,U,d,p){let $=null;const R=d.isPointLight===!0?C.customDistanceMaterial:C.customDepthMaterial;if(R!==void 0)$=R;else if($=d.isPointLight===!0?P:m,e.localClippingEnabled&&U.clipShadows===!0&&Array.isArray(U.clippingPlanes)&&U.clippingPlanes.length!==0||U.displacementMap&&U.displacementScale!==0||U.alphaMap&&U.alphaTest>0||U.map&&U.alphaTest>0||U.alphaToCoverage===!0){const H=$.uuid,V=U.uuid;let z=A[H];z===void 0&&(z={},A[H]=z);let K=z[V];K===void 0&&(K=$.clone(),z[V]=K,U.addEventListener("dispose",y)),$=K}if($.visible=U.visible,$.wireframe=U.wireframe,p===fn?$.side=U.shadowSide!==null?U.shadowSide:U.side:$.side=U.shadowSide!==null?U.shadowSide:D[U.side],$.alphaMap=U.alphaMap,$.alphaTest=U.alphaToCoverage===!0?.5:U.alphaTest,$.map=U.map,$.clipShadows=U.clipShadows,$.clippingPlanes=U.clippingPlanes,$.clipIntersection=U.clipIntersection,$.displacementMap=U.displacementMap,$.displacementScale=U.displacementScale,$.displacementBias=U.displacementBias,$.wireframeLinewidth=U.wireframeLinewidth,$.linewidth=U.linewidth,d.isPointLight===!0&&$.isMeshDistanceMaterial===!0){const H=e.properties.get($);H.light=d}return $}function v(C,U,d,p,$){if(C.visible===!1)return;if(C.layers.test(U.layers)&&(C.isMesh||C.isLine||C.isPoints)&&(C.castShadow||C.receiveShadow&&$===fn)&&(!C.frustumCulled||i.intersectsObject(C))){C.modelViewMatrix.multiplyMatrices(d.matrixWorldInverse,C.matrixWorld);const V=n.update(C),z=C.material;if(Array.isArray(z)){const K=V.groups;for(let N=0,F=K.length;N<F;N++){const se=K[N],Y=z[se.materialIndex];if(Y&&Y.visible){const ae=T(C,Y,p,$);C.onBeforeShadow(e,C,U,d,V,ae,se),e.renderBufferDirect(d,null,V,ae,C,se),C.onAfterShadow(e,C,U,d,V,ae,se)}}}else if(z.visible){const K=T(C,z,p,$);C.onBeforeShadow(e,C,U,d,V,K,null),e.renderBufferDirect(d,null,V,K,C,null),C.onAfterShadow(e,C,U,d,V,K,null)}}const H=C.children;for(let V=0,z=H.length;V<z;V++)v(H[V],U,d,p,$)}function y(C){C.target.removeEventListener("dispose",y);for(const d in A){const p=A[d],$=C.target.uuid;$ in p&&(p[$].dispose(),delete p[$])}}}function Nd(e,n){function t(){let E=!1;const oe=new gt;let ie=null;const he=new gt(0,0,0,0);return{setMask:function(ee){ie!==ee&&!E&&(e.colorMask(ee,ee,ee,ee),ie=ee)},setLocked:function(ee){E=ee},setClear:function(ee,k,Se,ye,nt){nt===!0&&(ee*=ye,k*=ye,Se*=ye),oe.set(ee,k,Se,ye),he.equals(oe)===!1&&(e.clearColor(ee,k,Se,ye),he.copy(oe))},reset:function(){E=!1,ie=null,he.set(-1,0,0,0)}}}function i(){let E=!1,oe=!1,ie=null,he=null,ee=null;return{setReversed:function(k){if(oe!==k){const Se=n.get("EXT_clip_control");k?Se.clipControlEXT(Se.LOWER_LEFT_EXT,Se.ZERO_TO_ONE_EXT):Se.clipControlEXT(Se.LOWER_LEFT_EXT,Se.NEGATIVE_ONE_TO_ONE_EXT),oe=k;const ye=ee;ee=null,this.setClear(ye)}},getReversed:function(){return oe},setTest:function(k){k?q(e.DEPTH_TEST):Q(e.DEPTH_TEST)},setMask:function(k){ie!==k&&!E&&(e.depthMask(k),ie=k)},setFunc:function(k){if(oe&&(k=Bo[k]),he!==k){switch(k){case xo:e.depthFunc(e.NEVER);break;case Eo:e.depthFunc(e.ALWAYS);break;case So:e.depthFunc(e.LESS);break;case Mi:e.depthFunc(e.LEQUAL);break;case vo:e.depthFunc(e.EQUAL);break;case go:e.depthFunc(e.GEQUAL);break;case _o:e.depthFunc(e.GREATER);break;case mo:e.depthFunc(e.NOTEQUAL);break;default:e.depthFunc(e.LEQUAL)}he=k}},setLocked:function(k){E=k},setClear:function(k){ee!==k&&(ee=k,oe&&(k=1-k),e.clearDepth(k))},reset:function(){E=!1,ie=null,he=null,ee=null,oe=!1}}}function o(){let E=!1,oe=null,ie=null,he=null,ee=null,k=null,Se=null,ye=null,nt=null;return{setTest:function(qe){E||(qe?q(e.STENCIL_TEST):Q(e.STENCIL_TEST))},setMask:function(qe){oe!==qe&&!E&&(e.stencilMask(qe),oe=qe)},setFunc:function(qe,Lt,wt){(ie!==qe||he!==Lt||ee!==wt)&&(e.stencilFunc(qe,Lt,wt),ie=qe,he=Lt,ee=wt)},setOp:function(qe,Lt,wt){(k!==qe||Se!==Lt||ye!==wt)&&(e.stencilOp(qe,Lt,wt),k=qe,Se=Lt,ye=wt)},setLocked:function(qe){E=qe},setClear:function(qe){nt!==qe&&(e.clearStencil(qe),nt=qe)},reset:function(){E=!1,oe=null,ie=null,he=null,ee=null,k=null,Se=null,ye=null,nt=null}}}const r=new t,f=new i,m=new o,P=new WeakMap,A=new WeakMap;let G={},D={},h=new WeakMap,x=[],S=null,I=!1,c=null,s=null,_=null,T=null,v=null,y=null,C=null,U=new Xe(0,0,0),d=0,p=!1,$=null,R=null,H=null,V=null,z=null;const K=e.getParameter(e.MAX_COMBINED_TEXTURE_IMAGE_UNITS);let N=!1,F=0;const se=e.getParameter(e.VERSION);se.indexOf("WebGL")!==-1?(F=parseFloat(/^WebGL (\d)/.exec(se)[1]),N=F>=1):se.indexOf("OpenGL ES")!==-1&&(F=parseFloat(/^OpenGL ES (\d)/.exec(se)[1]),N=F>=2);let Y=null,ae={};const te=e.getParameter(e.SCISSOR_BOX),j=e.getParameter(e.VIEWPORT),de=new gt().fromArray(te),Ce=new gt().fromArray(j);function me(E,oe,ie,he){const ee=new Uint8Array(4),k=e.createTexture();e.bindTexture(E,k),e.texParameteri(E,e.TEXTURE_MIN_FILTER,e.NEAREST),e.texParameteri(E,e.TEXTURE_MAG_FILTER,e.NEAREST);for(let Se=0;Se<ie;Se++)E===e.TEXTURE_3D||E===e.TEXTURE_2D_ARRAY?e.texImage3D(oe,0,e.RGBA,1,1,he,0,e.RGBA,e.UNSIGNED_BYTE,ee):e.texImage2D(oe+Se,0,e.RGBA,1,1,0,e.RGBA,e.UNSIGNED_BYTE,ee);return k}const B={};B[e.TEXTURE_2D]=me(e.TEXTURE_2D,e.TEXTURE_2D,1),B[e.TEXTURE_CUBE_MAP]=me(e.TEXTURE_CUBE_MAP,e.TEXTURE_CUBE_MAP_POSITIVE_X,6),B[e.TEXTURE_2D_ARRAY]=me(e.TEXTURE_2D_ARRAY,e.TEXTURE_2D_ARRAY,1,1),B[e.TEXTURE_3D]=me(e.TEXTURE_3D,e.TEXTURE_3D,1,1),r.setClear(0,0,0,1),f.setClear(1),m.setClear(0),q(e.DEPTH_TEST),f.setFunc(Mi),Ie(!1),$e(ta),q(e.CULL_FACE),Fe(It);function q(E){G[E]!==!0&&(e.enable(E),G[E]=!0)}function Q(E){G[E]!==!1&&(e.disable(E),G[E]=!1)}function De(E,oe){return D[E]!==oe?(e.bindFramebuffer(E,oe),D[E]=oe,E===e.DRAW_FRAMEBUFFER&&(D[e.FRAMEBUFFER]=oe),E===e.FRAMEBUFFER&&(D[e.DRAW_FRAMEBUFFER]=oe),!0):!1}function _e(E,oe){let ie=x,he=!1;if(E){ie=h.get(oe),ie===void 0&&(ie=[],h.set(oe,ie));const ee=E.textures;if(ie.length!==ee.length||ie[0]!==e.COLOR_ATTACHMENT0){for(let k=0,Se=ee.length;k<Se;k++)ie[k]=e.COLOR_ATTACHMENT0+k;ie.length=ee.length,he=!0}}else ie[0]!==e.BACK&&(ie[0]=e.BACK,he=!0);he&&e.drawBuffers(ie)}function Me(E){return S!==E?(e.useProgram(E),S=E,!0):!1}const ke={[sn]:e.FUNC_ADD,[Ir]:e.FUNC_SUBTRACT,[Ur]:e.FUNC_REVERSE_SUBTRACT};ke[Go]=e.MIN,ke[Ho]=e.MAX;const Le={[qr]:e.ZERO,[Kr]:e.ONE,[Yr]:e.SRC_COLOR,[Xr]:e.SRC_ALPHA,[zr]:e.SRC_ALPHA_SATURATE,[Wr]:e.DST_COLOR,[kr]:e.DST_ALPHA,[Vr]:e.ONE_MINUS_SRC_COLOR,[Hr]:e.ONE_MINUS_SRC_ALPHA,[Gr]:e.ONE_MINUS_DST_COLOR,[Br]:e.ONE_MINUS_DST_ALPHA,[Or]:e.CONSTANT_COLOR,[Fr]:e.ONE_MINUS_CONSTANT_COLOR,[Nr]:e.CONSTANT_ALPHA,[yr]:e.ONE_MINUS_CONSTANT_ALPHA};function Fe(E,oe,ie,he,ee,k,Se,ye,nt,qe){if(E===It){I===!0&&(Q(e.BLEND),I=!1);return}if(I===!1&&(q(e.BLEND),I=!0),E!==Ao){if(E!==c||qe!==p){if((s!==sn||v!==sn)&&(e.blendEquation(e.FUNC_ADD),s=sn,v=sn),qe)switch(E){case bn:e.blendFuncSeparate(e.ONE,e.ONE_MINUS_SRC_ALPHA,e.ONE,e.ONE_MINUS_SRC_ALPHA);break;case aa:e.blendFunc(e.ONE,e.ONE);break;case ia:e.blendFuncSeparate(e.ZERO,e.ONE_MINUS_SRC_COLOR,e.ZERO,e.ONE);break;case na:e.blendFuncSeparate(e.DST_COLOR,e.ONE_MINUS_SRC_ALPHA,e.ZERO,e.ONE);break;default:rt("WebGLState: Invalid blending: ",E);break}else switch(E){case bn:e.blendFuncSeparate(e.SRC_ALPHA,e.ONE_MINUS_SRC_ALPHA,e.ONE,e.ONE_MINUS_SRC_ALPHA);break;case aa:e.blendFuncSeparate(e.SRC_ALPHA,e.ONE,e.ONE,e.ONE);break;case ia:rt("WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true");break;case na:rt("WebGLState: MultiplyBlending requires material.premultipliedAlpha = true");break;default:rt("WebGLState: Invalid blending: ",E);break}_=null,T=null,y=null,C=null,U.set(0,0,0),d=0,c=E,p=qe}return}ee=ee||oe,k=k||ie,Se=Se||he,(oe!==s||ee!==v)&&(e.blendEquationSeparate(ke[oe],ke[ee]),s=oe,v=ee),(ie!==_||he!==T||k!==y||Se!==C)&&(e.blendFuncSeparate(Le[ie],Le[he],Le[k],Le[Se]),_=ie,T=he,y=k,C=Se),(ye.equals(U)===!1||nt!==d)&&(e.blendColor(ye.r,ye.g,ye.b,nt),U.copy(ye),d=nt),c=E,p=!1}function He(E,oe){E.side===Et?Q(e.CULL_FACE):q(e.CULL_FACE);let ie=E.side===Mt;oe&&(ie=!ie),Ie(ie),E.blending===bn&&E.transparent===!1?Fe(It):Fe(E.blending,E.blendEquation,E.blendSrc,E.blendDst,E.blendEquationAlpha,E.blendSrcAlpha,E.blendDstAlpha,E.blendColor,E.blendAlpha,E.premultipliedAlpha),f.setFunc(E.depthFunc),f.setTest(E.depthTest),f.setMask(E.depthWrite),r.setMask(E.colorWrite);const he=E.stencilWrite;m.setTest(he),he&&(m.setMask(E.stencilWriteMask),m.setFunc(E.stencilFunc,E.stencilRef,E.stencilFuncMask),m.setOp(E.stencilFail,E.stencilZFail,E.stencilZPass)),Ke(E.polygonOffset,E.polygonOffsetFactor,E.polygonOffsetUnits),E.alphaToCoverage===!0?q(e.SAMPLE_ALPHA_TO_COVERAGE):Q(e.SAMPLE_ALPHA_TO_COVERAGE)}function Ie(E){$!==E&&(E?e.frontFace(e.CW):e.frontFace(e.CCW),$=E)}function $e(E){E!==Mo?(q(e.CULL_FACE),E!==R&&(E===ta?e.cullFace(e.BACK):E===To?e.cullFace(e.FRONT):e.cullFace(e.FRONT_AND_BACK))):Q(e.CULL_FACE),R=E}function g(E){E!==H&&(N&&e.lineWidth(E),H=E)}function Ke(E,oe,ie){E?(q(e.POLYGON_OFFSET_FILL),(V!==oe||z!==ie)&&(V=oe,z=ie,f.getReversed()&&(oe=-oe),e.polygonOffset(oe,ie))):Q(e.POLYGON_OFFSET_FILL)}function Ve(E){E?q(e.SCISSOR_TEST):Q(e.SCISSOR_TEST)}function Ye(E){E===void 0&&(E=e.TEXTURE0+K-1),Y!==E&&(e.activeTexture(E),Y=E)}function Te(E,oe,ie){ie===void 0&&(Y===null?ie=e.TEXTURE0+K-1:ie=Y);let he=ae[ie];he===void 0&&(he={type:void 0,texture:void 0},ae[ie]=he),(he.type!==E||he.texture!==oe)&&(Y!==ie&&(e.activeTexture(ie),Y=ie),e.bindTexture(E,oe||B[E]),he.type=E,he.texture=oe)}function u(){const E=ae[Y];E!==void 0&&E.type!==void 0&&(e.bindTexture(E.type,null),E.type=void 0,E.texture=void 0)}function a(){try{e.compressedTexImage2D(...arguments)}catch(E){rt("WebGLState:",E)}}function M(){try{e.compressedTexImage3D(...arguments)}catch(E){rt("WebGLState:",E)}}function X(){try{e.texSubImage2D(...arguments)}catch(E){rt("WebGLState:",E)}}function Z(){try{e.texSubImage3D(...arguments)}catch(E){rt("WebGLState:",E)}}function W(){try{e.compressedTexSubImage2D(...arguments)}catch(E){rt("WebGLState:",E)}}function ge(){try{e.compressedTexSubImage3D(...arguments)}catch(E){rt("WebGLState:",E)}}function re(){try{e.texStorage2D(...arguments)}catch(E){rt("WebGLState:",E)}}function Pe(){try{e.texStorage3D(...arguments)}catch(E){rt("WebGLState:",E)}}function we(){try{e.texImage2D(...arguments)}catch(E){rt("WebGLState:",E)}}function J(){try{e.texImage3D(...arguments)}catch(E){rt("WebGLState:",E)}}function ne(E){de.equals(E)===!1&&(e.scissor(E.x,E.y,E.z,E.w),de.copy(E))}function ve(E){Ce.equals(E)===!1&&(e.viewport(E.x,E.y,E.z,E.w),Ce.copy(E))}function Ee(E,oe){let ie=A.get(oe);ie===void 0&&(ie=new WeakMap,A.set(oe,ie));let he=ie.get(E);he===void 0&&(he=e.getUniformBlockIndex(oe,E.name),ie.set(E,he))}function ue(E,oe){const he=A.get(oe).get(E);P.get(oe)!==he&&(e.uniformBlockBinding(oe,he,E.__bindingPointIndex),P.set(oe,he))}function Be(){e.disable(e.BLEND),e.disable(e.CULL_FACE),e.disable(e.DEPTH_TEST),e.disable(e.POLYGON_OFFSET_FILL),e.disable(e.SCISSOR_TEST),e.disable(e.STENCIL_TEST),e.disable(e.SAMPLE_ALPHA_TO_COVERAGE),e.blendEquation(e.FUNC_ADD),e.blendFunc(e.ONE,e.ZERO),e.blendFuncSeparate(e.ONE,e.ZERO,e.ONE,e.ZERO),e.blendColor(0,0,0,0),e.colorMask(!0,!0,!0,!0),e.clearColor(0,0,0,0),e.depthMask(!0),e.depthFunc(e.LESS),f.setReversed(!1),e.clearDepth(1),e.stencilMask(4294967295),e.stencilFunc(e.ALWAYS,0,4294967295),e.stencilOp(e.KEEP,e.KEEP,e.KEEP),e.clearStencil(0),e.cullFace(e.BACK),e.frontFace(e.CCW),e.polygonOffset(0,0),e.activeTexture(e.TEXTURE0),e.bindFramebuffer(e.FRAMEBUFFER,null),e.bindFramebuffer(e.DRAW_FRAMEBUFFER,null),e.bindFramebuffer(e.READ_FRAMEBUFFER,null),e.useProgram(null),e.lineWidth(1),e.scissor(0,0,e.canvas.width,e.canvas.height),e.viewport(0,0,e.canvas.width,e.canvas.height),G={},Y=null,ae={},D={},h=new WeakMap,x=[],S=null,I=!1,c=null,s=null,_=null,T=null,v=null,y=null,C=null,U=new Xe(0,0,0),d=0,p=!1,$=null,R=null,H=null,V=null,z=null,de.set(0,0,e.canvas.width,e.canvas.height),Ce.set(0,0,e.canvas.width,e.canvas.height),r.reset(),f.reset(),m.reset()}return{buffers:{color:r,depth:f,stencil:m},enable:q,disable:Q,bindFramebuffer:De,drawBuffers:_e,useProgram:Me,setBlending:Fe,setMaterial:He,setFlipSided:Ie,setCullFace:$e,setLineWidth:g,setPolygonOffset:Ke,setScissorTest:Ve,activeTexture:Ye,bindTexture:Te,unbindTexture:u,compressedTexImage2D:a,compressedTexImage3D:M,texImage2D:we,texImage3D:J,updateUBOMapping:Ee,uniformBlockBinding:ue,texStorage2D:re,texStorage3D:Pe,texSubImage2D:X,texSubImage3D:Z,compressedTexSubImage2D:W,compressedTexSubImage3D:ge,scissor:ne,viewport:ve,reset:Be}}function Fd(e,n,t,i,o,r,f){const m=n.has("WEBGL_multisampled_render_to_texture")?n.get("WEBGL_multisampled_render_to_texture"):null,P=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),A=new at,G=new WeakMap;let D;const h=new WeakMap;let x=!1;try{x=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function S(u,a){return x?new OffscreenCanvas(u,a):Io("canvas")}function I(u,a,M){let X=1;const Z=Te(u);if((Z.width>M||Z.height>M)&&(X=M/Math.max(Z.width,Z.height)),X<1)if(typeof HTMLImageElement<"u"&&u instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&u instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&u instanceof ImageBitmap||typeof VideoFrame<"u"&&u instanceof VideoFrame){const W=Math.floor(X*Z.width),ge=Math.floor(X*Z.height);D===void 0&&(D=S(W,ge));const re=a?S(W,ge):D;return re.width=W,re.height=ge,re.getContext("2d").drawImage(u,0,0,W,ge),tt("WebGLRenderer: Texture has been resized from ("+Z.width+"x"+Z.height+") to ("+W+"x"+ge+")."),re}else return"data"in u&&tt("WebGLRenderer: Image in DataTexture is too big ("+Z.width+"x"+Z.height+")."),u;return u}function c(u){return u.generateMipmaps}function s(u){e.generateMipmap(u)}function _(u){return u.isWebGLCubeRenderTarget?e.TEXTURE_CUBE_MAP:u.isWebGL3DRenderTarget?e.TEXTURE_3D:u.isWebGLArrayRenderTarget||u.isCompressedArrayTexture?e.TEXTURE_2D_ARRAY:e.TEXTURE_2D}function T(u,a,M,X,Z=!1){if(u!==null){if(e[u]!==void 0)return e[u];tt("WebGLRenderer: Attempt to use non-existing WebGL internal format '"+u+"'")}let W=a;if(a===e.RED&&(M===e.FLOAT&&(W=e.R32F),M===e.HALF_FLOAT&&(W=e.R16F),M===e.UNSIGNED_BYTE&&(W=e.R8)),a===e.RED_INTEGER&&(M===e.UNSIGNED_BYTE&&(W=e.R8UI),M===e.UNSIGNED_SHORT&&(W=e.R16UI),M===e.UNSIGNED_INT&&(W=e.R32UI),M===e.BYTE&&(W=e.R8I),M===e.SHORT&&(W=e.R16I),M===e.INT&&(W=e.R32I)),a===e.RG&&(M===e.FLOAT&&(W=e.RG32F),M===e.HALF_FLOAT&&(W=e.RG16F),M===e.UNSIGNED_BYTE&&(W=e.RG8)),a===e.RG_INTEGER&&(M===e.UNSIGNED_BYTE&&(W=e.RG8UI),M===e.UNSIGNED_SHORT&&(W=e.RG16UI),M===e.UNSIGNED_INT&&(W=e.RG32UI),M===e.BYTE&&(W=e.RG8I),M===e.SHORT&&(W=e.RG16I),M===e.INT&&(W=e.RG32I)),a===e.RGB_INTEGER&&(M===e.UNSIGNED_BYTE&&(W=e.RGB8UI),M===e.UNSIGNED_SHORT&&(W=e.RGB16UI),M===e.UNSIGNED_INT&&(W=e.RGB32UI),M===e.BYTE&&(W=e.RGB8I),M===e.SHORT&&(W=e.RGB16I),M===e.INT&&(W=e.RGB32I)),a===e.RGBA_INTEGER&&(M===e.UNSIGNED_BYTE&&(W=e.RGBA8UI),M===e.UNSIGNED_SHORT&&(W=e.RGBA16UI),M===e.UNSIGNED_INT&&(W=e.RGBA32UI),M===e.BYTE&&(W=e.RGBA8I),M===e.SHORT&&(W=e.RGBA16I),M===e.INT&&(W=e.RGBA32I)),a===e.RGB&&(M===e.UNSIGNED_INT_5_9_9_9_REV&&(W=e.RGB9_E5),M===e.UNSIGNED_INT_10F_11F_11F_REV&&(W=e.R11F_G11F_B10F)),a===e.RGBA){const ge=Z?lr:lt.getTransfer(X);M===e.FLOAT&&(W=e.RGBA32F),M===e.HALF_FLOAT&&(W=e.RGBA16F),M===e.UNSIGNED_BYTE&&(W=ge===it?e.SRGB8_ALPHA8:e.RGBA8),M===e.UNSIGNED_SHORT_4_4_4_4&&(W=e.RGBA4),M===e.UNSIGNED_SHORT_5_5_5_1&&(W=e.RGB5_A1)}return(W===e.R16F||W===e.R32F||W===e.RG16F||W===e.RG32F||W===e.RGBA16F||W===e.RGBA32F)&&n.get("EXT_color_buffer_float"),W}function v(u,a){let M;return u?a===null||a===Yt||a===hn?M=e.DEPTH24_STENCIL8:a===Ot?M=e.DEPTH32F_STENCIL8:a===wn&&(M=e.DEPTH24_STENCIL8,tt("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):a===null||a===Yt||a===hn?M=e.DEPTH_COMPONENT24:a===Ot?M=e.DEPTH_COMPONENT32F:a===wn&&(M=e.DEPTH_COMPONENT16),M}function y(u,a){return c(u)===!0||u.isFramebufferTexture&&u.minFilter!==Xt&&u.minFilter!==xt?Math.log2(Math.max(a.width,a.height))+1:u.mipmaps!==void 0&&u.mipmaps.length>0?u.mipmaps.length:u.isCompressedTexture&&Array.isArray(u.image)?a.mipmaps.length:1}function C(u){const a=u.target;a.removeEventListener("dispose",C),d(a),a.isVideoTexture&&G.delete(a)}function U(u){const a=u.target;a.removeEventListener("dispose",U),$(a)}function d(u){const a=i.get(u);if(a.__webglInit===void 0)return;const M=u.source,X=h.get(M);if(X){const Z=X[a.__cacheKey];Z.usedTimes--,Z.usedTimes===0&&p(u),Object.keys(X).length===0&&h.delete(M)}i.remove(u)}function p(u){const a=i.get(u);e.deleteTexture(a.__webglTexture);const M=u.source,X=h.get(M);delete X[a.__cacheKey],f.memory.textures--}function $(u){const a=i.get(u);if(u.depthTexture&&(u.depthTexture.dispose(),i.remove(u.depthTexture)),u.isWebGLCubeRenderTarget)for(let X=0;X<6;X++){if(Array.isArray(a.__webglFramebuffer[X]))for(let Z=0;Z<a.__webglFramebuffer[X].length;Z++)e.deleteFramebuffer(a.__webglFramebuffer[X][Z]);else e.deleteFramebuffer(a.__webglFramebuffer[X]);a.__webglDepthbuffer&&e.deleteRenderbuffer(a.__webglDepthbuffer[X])}else{if(Array.isArray(a.__webglFramebuffer))for(let X=0;X<a.__webglFramebuffer.length;X++)e.deleteFramebuffer(a.__webglFramebuffer[X]);else e.deleteFramebuffer(a.__webglFramebuffer);if(a.__webglDepthbuffer&&e.deleteRenderbuffer(a.__webglDepthbuffer),a.__webglMultisampledFramebuffer&&e.deleteFramebuffer(a.__webglMultisampledFramebuffer),a.__webglColorRenderbuffer)for(let X=0;X<a.__webglColorRenderbuffer.length;X++)a.__webglColorRenderbuffer[X]&&e.deleteRenderbuffer(a.__webglColorRenderbuffer[X]);a.__webglDepthRenderbuffer&&e.deleteRenderbuffer(a.__webglDepthRenderbuffer)}const M=u.textures;for(let X=0,Z=M.length;X<Z;X++){const W=i.get(M[X]);W.__webglTexture&&(e.deleteTexture(W.__webglTexture),f.memory.textures--),i.remove(M[X])}i.remove(u)}let R=0;function H(){R=0}function V(){const u=R;return u>=o.maxTextures&&tt("WebGLTextures: Trying to use "+u+" texture units while this GPU supports only "+o.maxTextures),R+=1,u}function z(u){const a=[];return a.push(u.wrapS),a.push(u.wrapT),a.push(u.wrapR||0),a.push(u.magFilter),a.push(u.minFilter),a.push(u.anisotropy),a.push(u.internalFormat),a.push(u.format),a.push(u.type),a.push(u.generateMipmaps),a.push(u.premultiplyAlpha),a.push(u.flipY),a.push(u.unpackAlignment),a.push(u.colorSpace),a.join()}function K(u,a){const M=i.get(u);if(u.isVideoTexture&&Ve(u),u.isRenderTargetTexture===!1&&u.isExternalTexture!==!0&&u.version>0&&M.__version!==u.version){const X=u.image;if(X===null)tt("WebGLRenderer: Texture marked for update but no image data found.");else if(X.complete===!1)tt("WebGLRenderer: Texture marked for update but image is incomplete");else{B(M,u,a);return}}else u.isExternalTexture&&(M.__webglTexture=u.sourceTexture?u.sourceTexture:null);t.bindTexture(e.TEXTURE_2D,M.__webglTexture,e.TEXTURE0+a)}function N(u,a){const M=i.get(u);if(u.isRenderTargetTexture===!1&&u.version>0&&M.__version!==u.version){B(M,u,a);return}else u.isExternalTexture&&(M.__webglTexture=u.sourceTexture?u.sourceTexture:null);t.bindTexture(e.TEXTURE_2D_ARRAY,M.__webglTexture,e.TEXTURE0+a)}function F(u,a){const M=i.get(u);if(u.isRenderTargetTexture===!1&&u.version>0&&M.__version!==u.version){B(M,u,a);return}t.bindTexture(e.TEXTURE_3D,M.__webglTexture,e.TEXTURE0+a)}function se(u,a){const M=i.get(u);if(u.isCubeDepthTexture!==!0&&u.version>0&&M.__version!==u.version){q(M,u,a);return}t.bindTexture(e.TEXTURE_CUBE_MAP,M.__webglTexture,e.TEXTURE0+a)}const Y={[$r]:e.REPEAT,[ii]:e.CLAMP_TO_EDGE,[Zr]:e.MIRRORED_REPEAT},ae={[Xt]:e.NEAREST,[jr]:e.NEAREST_MIPMAP_NEAREST,[Sn]:e.NEAREST_MIPMAP_LINEAR,[xt]:e.LINEAR,[Gn]:e.LINEAR_MIPMAP_NEAREST,[jt]:e.LINEAR_MIPMAP_LINEAR},te={[io]:e.NEVER,[no]:e.ALWAYS,[to]:e.LESS,[li]:e.LEQUAL,[eo]:e.EQUAL,[si]:e.GEQUAL,[Jr]:e.GREATER,[Qr]:e.NOTEQUAL};function j(u,a){if(a.type===Ot&&n.has("OES_texture_float_linear")===!1&&(a.magFilter===xt||a.magFilter===Gn||a.magFilter===Sn||a.magFilter===jt||a.minFilter===xt||a.minFilter===Gn||a.minFilter===Sn||a.minFilter===jt)&&tt("WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),e.texParameteri(u,e.TEXTURE_WRAP_S,Y[a.wrapS]),e.texParameteri(u,e.TEXTURE_WRAP_T,Y[a.wrapT]),(u===e.TEXTURE_3D||u===e.TEXTURE_2D_ARRAY)&&e.texParameteri(u,e.TEXTURE_WRAP_R,Y[a.wrapR]),e.texParameteri(u,e.TEXTURE_MAG_FILTER,ae[a.magFilter]),e.texParameteri(u,e.TEXTURE_MIN_FILTER,ae[a.minFilter]),a.compareFunction&&(e.texParameteri(u,e.TEXTURE_COMPARE_MODE,e.COMPARE_REF_TO_TEXTURE),e.texParameteri(u,e.TEXTURE_COMPARE_FUNC,te[a.compareFunction])),n.has("EXT_texture_filter_anisotropic")===!0){if(a.magFilter===Xt||a.minFilter!==Sn&&a.minFilter!==jt||a.type===Ot&&n.has("OES_texture_float_linear")===!1)return;if(a.anisotropy>1||i.get(a).__currentAnisotropy){const M=n.get("EXT_texture_filter_anisotropic");e.texParameterf(u,M.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(a.anisotropy,o.getMaxAnisotropy())),i.get(a).__currentAnisotropy=a.anisotropy}}}function de(u,a){let M=!1;u.__webglInit===void 0&&(u.__webglInit=!0,a.addEventListener("dispose",C));const X=a.source;let Z=h.get(X);Z===void 0&&(Z={},h.set(X,Z));const W=z(a);if(W!==u.__cacheKey){Z[W]===void 0&&(Z[W]={texture:e.createTexture(),usedTimes:0},f.memory.textures++,M=!0),Z[W].usedTimes++;const ge=Z[u.__cacheKey];ge!==void 0&&(Z[u.__cacheKey].usedTimes--,ge.usedTimes===0&&p(a)),u.__cacheKey=W,u.__webglTexture=Z[W].texture}return M}function Ce(u,a,M){return Math.floor(Math.floor(u/M)/a)}function me(u,a,M,X){const W=u.updateRanges;if(W.length===0)t.texSubImage2D(e.TEXTURE_2D,0,0,0,a.width,a.height,M,X,a.data);else{W.sort((J,ne)=>J.start-ne.start);let ge=0;for(let J=1;J<W.length;J++){const ne=W[ge],ve=W[J],Ee=ne.start+ne.count,ue=Ce(ve.start,a.width,4),Be=Ce(ne.start,a.width,4);ve.start<=Ee+1&&ue===Be&&Ce(ve.start+ve.count-1,a.width,4)===ue?ne.count=Math.max(ne.count,ve.start+ve.count-ne.start):(++ge,W[ge]=ve)}W.length=ge+1;const re=e.getParameter(e.UNPACK_ROW_LENGTH),Pe=e.getParameter(e.UNPACK_SKIP_PIXELS),we=e.getParameter(e.UNPACK_SKIP_ROWS);e.pixelStorei(e.UNPACK_ROW_LENGTH,a.width);for(let J=0,ne=W.length;J<ne;J++){const ve=W[J],Ee=Math.floor(ve.start/4),ue=Math.ceil(ve.count/4),Be=Ee%a.width,E=Math.floor(Ee/a.width),oe=ue,ie=1;e.pixelStorei(e.UNPACK_SKIP_PIXELS,Be),e.pixelStorei(e.UNPACK_SKIP_ROWS,E),t.texSubImage2D(e.TEXTURE_2D,0,Be,E,oe,ie,M,X,a.data)}u.clearUpdateRanges(),e.pixelStorei(e.UNPACK_ROW_LENGTH,re),e.pixelStorei(e.UNPACK_SKIP_PIXELS,Pe),e.pixelStorei(e.UNPACK_SKIP_ROWS,we)}}function B(u,a,M){let X=e.TEXTURE_2D;(a.isDataArrayTexture||a.isCompressedArrayTexture)&&(X=e.TEXTURE_2D_ARRAY),a.isData3DTexture&&(X=e.TEXTURE_3D);const Z=de(u,a),W=a.source;t.bindTexture(X,u.__webglTexture,e.TEXTURE0+M);const ge=i.get(W);if(W.version!==ge.__version||Z===!0){t.activeTexture(e.TEXTURE0+M);const re=lt.getPrimaries(lt.workingColorSpace),Pe=a.colorSpace===$t?null:lt.getPrimaries(a.colorSpace),we=a.colorSpace===$t||re===Pe?e.NONE:e.BROWSER_DEFAULT_WEBGL;e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,a.flipY),e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,a.premultiplyAlpha),e.pixelStorei(e.UNPACK_ALIGNMENT,a.unpackAlignment),e.pixelStorei(e.UNPACK_COLORSPACE_CONVERSION_WEBGL,we);let J=I(a.image,!1,o.maxTextureSize);J=Ye(a,J);const ne=r.convert(a.format,a.colorSpace),ve=r.convert(a.type);let Ee=T(a.internalFormat,ne,ve,a.colorSpace,a.isVideoTexture);j(X,a);let ue;const Be=a.mipmaps,E=a.isVideoTexture!==!0,oe=ge.__version===void 0||Z===!0,ie=W.dataReady,he=y(a,J);if(a.isDepthTexture)Ee=v(a.format===Qt,a.type),oe&&(E?t.texStorage2D(e.TEXTURE_2D,1,Ee,J.width,J.height):t.texImage2D(e.TEXTURE_2D,0,Ee,J.width,J.height,0,ne,ve,null));else if(a.isDataTexture)if(Be.length>0){E&&oe&&t.texStorage2D(e.TEXTURE_2D,he,Ee,Be[0].width,Be[0].height);for(let ee=0,k=Be.length;ee<k;ee++)ue=Be[ee],E?ie&&t.texSubImage2D(e.TEXTURE_2D,ee,0,0,ue.width,ue.height,ne,ve,ue.data):t.texImage2D(e.TEXTURE_2D,ee,Ee,ue.width,ue.height,0,ne,ve,ue.data);a.generateMipmaps=!1}else E?(oe&&t.texStorage2D(e.TEXTURE_2D,he,Ee,J.width,J.height),ie&&me(a,J,ne,ve)):t.texImage2D(e.TEXTURE_2D,0,Ee,J.width,J.height,0,ne,ve,J.data);else if(a.isCompressedTexture)if(a.isCompressedArrayTexture){E&&oe&&t.texStorage3D(e.TEXTURE_2D_ARRAY,he,Ee,Be[0].width,Be[0].height,J.depth);for(let ee=0,k=Be.length;ee<k;ee++)if(ue=Be[ee],a.format!==Ut)if(ne!==null)if(E){if(ie)if(a.layerUpdates.size>0){const Se=ra(ue.width,ue.height,a.format,a.type);for(const ye of a.layerUpdates){const nt=ue.data.subarray(ye*Se/ue.data.BYTES_PER_ELEMENT,(ye+1)*Se/ue.data.BYTES_PER_ELEMENT);t.compressedTexSubImage3D(e.TEXTURE_2D_ARRAY,ee,0,0,ye,ue.width,ue.height,1,ne,nt)}a.clearLayerUpdates()}else t.compressedTexSubImage3D(e.TEXTURE_2D_ARRAY,ee,0,0,0,ue.width,ue.height,J.depth,ne,ue.data)}else t.compressedTexImage3D(e.TEXTURE_2D_ARRAY,ee,Ee,ue.width,ue.height,J.depth,0,ue.data,0,0);else tt("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else E?ie&&t.texSubImage3D(e.TEXTURE_2D_ARRAY,ee,0,0,0,ue.width,ue.height,J.depth,ne,ve,ue.data):t.texImage3D(e.TEXTURE_2D_ARRAY,ee,Ee,ue.width,ue.height,J.depth,0,ne,ve,ue.data)}else{E&&oe&&t.texStorage2D(e.TEXTURE_2D,he,Ee,Be[0].width,Be[0].height);for(let ee=0,k=Be.length;ee<k;ee++)ue=Be[ee],a.format!==Ut?ne!==null?E?ie&&t.compressedTexSubImage2D(e.TEXTURE_2D,ee,0,0,ue.width,ue.height,ne,ue.data):t.compressedTexImage2D(e.TEXTURE_2D,ee,Ee,ue.width,ue.height,0,ue.data):tt("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):E?ie&&t.texSubImage2D(e.TEXTURE_2D,ee,0,0,ue.width,ue.height,ne,ve,ue.data):t.texImage2D(e.TEXTURE_2D,ee,Ee,ue.width,ue.height,0,ne,ve,ue.data)}else if(a.isDataArrayTexture)if(E){if(oe&&t.texStorage3D(e.TEXTURE_2D_ARRAY,he,Ee,J.width,J.height,J.depth),ie)if(a.layerUpdates.size>0){const ee=ra(J.width,J.height,a.format,a.type);for(const k of a.layerUpdates){const Se=J.data.subarray(k*ee/J.data.BYTES_PER_ELEMENT,(k+1)*ee/J.data.BYTES_PER_ELEMENT);t.texSubImage3D(e.TEXTURE_2D_ARRAY,0,0,0,k,J.width,J.height,1,ne,ve,Se)}a.clearLayerUpdates()}else t.texSubImage3D(e.TEXTURE_2D_ARRAY,0,0,0,0,J.width,J.height,J.depth,ne,ve,J.data)}else t.texImage3D(e.TEXTURE_2D_ARRAY,0,Ee,J.width,J.height,J.depth,0,ne,ve,J.data);else if(a.isData3DTexture)E?(oe&&t.texStorage3D(e.TEXTURE_3D,he,Ee,J.width,J.height,J.depth),ie&&t.texSubImage3D(e.TEXTURE_3D,0,0,0,0,J.width,J.height,J.depth,ne,ve,J.data)):t.texImage3D(e.TEXTURE_3D,0,Ee,J.width,J.height,J.depth,0,ne,ve,J.data);else if(a.isFramebufferTexture){if(oe)if(E)t.texStorage2D(e.TEXTURE_2D,he,Ee,J.width,J.height);else{let ee=J.width,k=J.height;for(let Se=0;Se<he;Se++)t.texImage2D(e.TEXTURE_2D,Se,Ee,ee,k,0,ne,ve,null),ee>>=1,k>>=1}}else if(Be.length>0){if(E&&oe){const ee=Te(Be[0]);t.texStorage2D(e.TEXTURE_2D,he,Ee,ee.width,ee.height)}for(let ee=0,k=Be.length;ee<k;ee++)ue=Be[ee],E?ie&&t.texSubImage2D(e.TEXTURE_2D,ee,0,0,ne,ve,ue):t.texImage2D(e.TEXTURE_2D,ee,Ee,ne,ve,ue);a.generateMipmaps=!1}else if(E){if(oe){const ee=Te(J);t.texStorage2D(e.TEXTURE_2D,he,Ee,ee.width,ee.height)}ie&&t.texSubImage2D(e.TEXTURE_2D,0,0,0,ne,ve,J)}else t.texImage2D(e.TEXTURE_2D,0,Ee,ne,ve,J);c(a)&&s(X),ge.__version=W.version,a.onUpdate&&a.onUpdate(a)}u.__version=a.version}function q(u,a,M){if(a.image.length!==6)return;const X=de(u,a),Z=a.source;t.bindTexture(e.TEXTURE_CUBE_MAP,u.__webglTexture,e.TEXTURE0+M);const W=i.get(Z);if(Z.version!==W.__version||X===!0){t.activeTexture(e.TEXTURE0+M);const ge=lt.getPrimaries(lt.workingColorSpace),re=a.colorSpace===$t?null:lt.getPrimaries(a.colorSpace),Pe=a.colorSpace===$t||ge===re?e.NONE:e.BROWSER_DEFAULT_WEBGL;e.pixelStorei(e.UNPACK_FLIP_Y_WEBGL,a.flipY),e.pixelStorei(e.UNPACK_PREMULTIPLY_ALPHA_WEBGL,a.premultiplyAlpha),e.pixelStorei(e.UNPACK_ALIGNMENT,a.unpackAlignment),e.pixelStorei(e.UNPACK_COLORSPACE_CONVERSION_WEBGL,Pe);const we=a.isCompressedTexture||a.image[0].isCompressedTexture,J=a.image[0]&&a.image[0].isDataTexture,ne=[];for(let k=0;k<6;k++)!we&&!J?ne[k]=I(a.image[k],!0,o.maxCubemapSize):ne[k]=J?a.image[k].image:a.image[k],ne[k]=Ye(a,ne[k]);const ve=ne[0],Ee=r.convert(a.format,a.colorSpace),ue=r.convert(a.type),Be=T(a.internalFormat,Ee,ue,a.colorSpace),E=a.isVideoTexture!==!0,oe=W.__version===void 0||X===!0,ie=Z.dataReady;let he=y(a,ve);j(e.TEXTURE_CUBE_MAP,a);let ee;if(we){E&&oe&&t.texStorage2D(e.TEXTURE_CUBE_MAP,he,Be,ve.width,ve.height);for(let k=0;k<6;k++){ee=ne[k].mipmaps;for(let Se=0;Se<ee.length;Se++){const ye=ee[Se];a.format!==Ut?Ee!==null?E?ie&&t.compressedTexSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+k,Se,0,0,ye.width,ye.height,Ee,ye.data):t.compressedTexImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+k,Se,Be,ye.width,ye.height,0,ye.data):tt("WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):E?ie&&t.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+k,Se,0,0,ye.width,ye.height,Ee,ue,ye.data):t.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+k,Se,Be,ye.width,ye.height,0,Ee,ue,ye.data)}}}else{if(ee=a.mipmaps,E&&oe){ee.length>0&&he++;const k=Te(ne[0]);t.texStorage2D(e.TEXTURE_CUBE_MAP,he,Be,k.width,k.height)}for(let k=0;k<6;k++)if(J){E?ie&&t.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+k,0,0,0,ne[k].width,ne[k].height,Ee,ue,ne[k].data):t.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+k,0,Be,ne[k].width,ne[k].height,0,Ee,ue,ne[k].data);for(let Se=0;Se<ee.length;Se++){const nt=ee[Se].image[k].image;E?ie&&t.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+k,Se+1,0,0,nt.width,nt.height,Ee,ue,nt.data):t.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+k,Se+1,Be,nt.width,nt.height,0,Ee,ue,nt.data)}}else{E?ie&&t.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+k,0,0,0,Ee,ue,ne[k]):t.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+k,0,Be,Ee,ue,ne[k]);for(let Se=0;Se<ee.length;Se++){const ye=ee[Se];E?ie&&t.texSubImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+k,Se+1,0,0,Ee,ue,ye.image[k]):t.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+k,Se+1,Be,Ee,ue,ye.image[k])}}}c(a)&&s(e.TEXTURE_CUBE_MAP),W.__version=Z.version,a.onUpdate&&a.onUpdate(a)}u.__version=a.version}function Q(u,a,M,X,Z,W){const ge=r.convert(M.format,M.colorSpace),re=r.convert(M.type),Pe=T(M.internalFormat,ge,re,M.colorSpace),we=i.get(a),J=i.get(M);if(J.__renderTarget=a,!we.__hasExternalTextures){const ne=Math.max(1,a.width>>W),ve=Math.max(1,a.height>>W);Z===e.TEXTURE_3D||Z===e.TEXTURE_2D_ARRAY?t.texImage3D(Z,W,Pe,ne,ve,a.depth,0,ge,re,null):t.texImage2D(Z,W,Pe,ne,ve,0,ge,re,null)}t.bindFramebuffer(e.FRAMEBUFFER,u),Ke(a)?m.framebufferTexture2DMultisampleEXT(e.FRAMEBUFFER,X,Z,J.__webglTexture,0,g(a)):(Z===e.TEXTURE_2D||Z>=e.TEXTURE_CUBE_MAP_POSITIVE_X&&Z<=e.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&e.framebufferTexture2D(e.FRAMEBUFFER,X,Z,J.__webglTexture,W),t.bindFramebuffer(e.FRAMEBUFFER,null)}function De(u,a,M){if(e.bindRenderbuffer(e.RENDERBUFFER,u),a.depthBuffer){const X=a.depthTexture,Z=X&&X.isDepthTexture?X.type:null,W=v(a.stencilBuffer,Z),ge=a.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT;Ke(a)?m.renderbufferStorageMultisampleEXT(e.RENDERBUFFER,g(a),W,a.width,a.height):M?e.renderbufferStorageMultisample(e.RENDERBUFFER,g(a),W,a.width,a.height):e.renderbufferStorage(e.RENDERBUFFER,W,a.width,a.height),e.framebufferRenderbuffer(e.FRAMEBUFFER,ge,e.RENDERBUFFER,u)}else{const X=a.textures;for(let Z=0;Z<X.length;Z++){const W=X[Z],ge=r.convert(W.format,W.colorSpace),re=r.convert(W.type),Pe=T(W.internalFormat,ge,re,W.colorSpace);Ke(a)?m.renderbufferStorageMultisampleEXT(e.RENDERBUFFER,g(a),Pe,a.width,a.height):M?e.renderbufferStorageMultisample(e.RENDERBUFFER,g(a),Pe,a.width,a.height):e.renderbufferStorage(e.RENDERBUFFER,Pe,a.width,a.height)}}e.bindRenderbuffer(e.RENDERBUFFER,null)}function _e(u,a,M){const X=a.isWebGLCubeRenderTarget===!0;if(t.bindFramebuffer(e.FRAMEBUFFER,u),!(a.depthTexture&&a.depthTexture.isDepthTexture))throw new Error("renderTarget.depthTexture must be an instance of THREE.DepthTexture");const Z=i.get(a.depthTexture);if(Z.__renderTarget=a,(!Z.__webglTexture||a.depthTexture.image.width!==a.width||a.depthTexture.image.height!==a.height)&&(a.depthTexture.image.width=a.width,a.depthTexture.image.height=a.height,a.depthTexture.needsUpdate=!0),X){if(Z.__webglInit===void 0&&(Z.__webglInit=!0,a.depthTexture.addEventListener("dispose",C)),Z.__webglTexture===void 0){Z.__webglTexture=e.createTexture(),t.bindTexture(e.TEXTURE_CUBE_MAP,Z.__webglTexture),j(e.TEXTURE_CUBE_MAP,a.depthTexture);const we=r.convert(a.depthTexture.format),J=r.convert(a.depthTexture.type);let ne;a.depthTexture.format===an?ne=e.DEPTH_COMPONENT24:a.depthTexture.format===Qt&&(ne=e.DEPTH24_STENCIL8);for(let ve=0;ve<6;ve++)e.texImage2D(e.TEXTURE_CUBE_MAP_POSITIVE_X+ve,0,ne,a.width,a.height,0,we,J,null)}}else K(a.depthTexture,0);const W=Z.__webglTexture,ge=g(a),re=X?e.TEXTURE_CUBE_MAP_POSITIVE_X+M:e.TEXTURE_2D,Pe=a.depthTexture.format===Qt?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT;if(a.depthTexture.format===an)Ke(a)?m.framebufferTexture2DMultisampleEXT(e.FRAMEBUFFER,Pe,re,W,0,ge):e.framebufferTexture2D(e.FRAMEBUFFER,Pe,re,W,0);else if(a.depthTexture.format===Qt)Ke(a)?m.framebufferTexture2DMultisampleEXT(e.FRAMEBUFFER,Pe,re,W,0,ge):e.framebufferTexture2D(e.FRAMEBUFFER,Pe,re,W,0);else throw new Error("Unknown depthTexture format")}function Me(u){const a=i.get(u),M=u.isWebGLCubeRenderTarget===!0;if(a.__boundDepthTexture!==u.depthTexture){const X=u.depthTexture;if(a.__depthDisposeCallback&&a.__depthDisposeCallback(),X){const Z=()=>{delete a.__boundDepthTexture,delete a.__depthDisposeCallback,X.removeEventListener("dispose",Z)};X.addEventListener("dispose",Z),a.__depthDisposeCallback=Z}a.__boundDepthTexture=X}if(u.depthTexture&&!a.__autoAllocateDepthBuffer)if(M)for(let X=0;X<6;X++)_e(a.__webglFramebuffer[X],u,X);else{const X=u.texture.mipmaps;X&&X.length>0?_e(a.__webglFramebuffer[0],u,0):_e(a.__webglFramebuffer,u,0)}else if(M){a.__webglDepthbuffer=[];for(let X=0;X<6;X++)if(t.bindFramebuffer(e.FRAMEBUFFER,a.__webglFramebuffer[X]),a.__webglDepthbuffer[X]===void 0)a.__webglDepthbuffer[X]=e.createRenderbuffer(),De(a.__webglDepthbuffer[X],u,!1);else{const Z=u.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT,W=a.__webglDepthbuffer[X];e.bindRenderbuffer(e.RENDERBUFFER,W),e.framebufferRenderbuffer(e.FRAMEBUFFER,Z,e.RENDERBUFFER,W)}}else{const X=u.texture.mipmaps;if(X&&X.length>0?t.bindFramebuffer(e.FRAMEBUFFER,a.__webglFramebuffer[0]):t.bindFramebuffer(e.FRAMEBUFFER,a.__webglFramebuffer),a.__webglDepthbuffer===void 0)a.__webglDepthbuffer=e.createRenderbuffer(),De(a.__webglDepthbuffer,u,!1);else{const Z=u.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT,W=a.__webglDepthbuffer;e.bindRenderbuffer(e.RENDERBUFFER,W),e.framebufferRenderbuffer(e.FRAMEBUFFER,Z,e.RENDERBUFFER,W)}}t.bindFramebuffer(e.FRAMEBUFFER,null)}function ke(u,a,M){const X=i.get(u);a!==void 0&&Q(X.__webglFramebuffer,u,u.texture,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,0),M!==void 0&&Me(u)}function Le(u){const a=u.texture,M=i.get(u),X=i.get(a);u.addEventListener("dispose",U);const Z=u.textures,W=u.isWebGLCubeRenderTarget===!0,ge=Z.length>1;if(ge||(X.__webglTexture===void 0&&(X.__webglTexture=e.createTexture()),X.__version=a.version,f.memory.textures++),W){M.__webglFramebuffer=[];for(let re=0;re<6;re++)if(a.mipmaps&&a.mipmaps.length>0){M.__webglFramebuffer[re]=[];for(let Pe=0;Pe<a.mipmaps.length;Pe++)M.__webglFramebuffer[re][Pe]=e.createFramebuffer()}else M.__webglFramebuffer[re]=e.createFramebuffer()}else{if(a.mipmaps&&a.mipmaps.length>0){M.__webglFramebuffer=[];for(let re=0;re<a.mipmaps.length;re++)M.__webglFramebuffer[re]=e.createFramebuffer()}else M.__webglFramebuffer=e.createFramebuffer();if(ge)for(let re=0,Pe=Z.length;re<Pe;re++){const we=i.get(Z[re]);we.__webglTexture===void 0&&(we.__webglTexture=e.createTexture(),f.memory.textures++)}if(u.samples>0&&Ke(u)===!1){M.__webglMultisampledFramebuffer=e.createFramebuffer(),M.__webglColorRenderbuffer=[],t.bindFramebuffer(e.FRAMEBUFFER,M.__webglMultisampledFramebuffer);for(let re=0;re<Z.length;re++){const Pe=Z[re];M.__webglColorRenderbuffer[re]=e.createRenderbuffer(),e.bindRenderbuffer(e.RENDERBUFFER,M.__webglColorRenderbuffer[re]);const we=r.convert(Pe.format,Pe.colorSpace),J=r.convert(Pe.type),ne=T(Pe.internalFormat,we,J,Pe.colorSpace,u.isXRRenderTarget===!0),ve=g(u);e.renderbufferStorageMultisample(e.RENDERBUFFER,ve,ne,u.width,u.height),e.framebufferRenderbuffer(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0+re,e.RENDERBUFFER,M.__webglColorRenderbuffer[re])}e.bindRenderbuffer(e.RENDERBUFFER,null),u.depthBuffer&&(M.__webglDepthRenderbuffer=e.createRenderbuffer(),De(M.__webglDepthRenderbuffer,u,!0)),t.bindFramebuffer(e.FRAMEBUFFER,null)}}if(W){t.bindTexture(e.TEXTURE_CUBE_MAP,X.__webglTexture),j(e.TEXTURE_CUBE_MAP,a);for(let re=0;re<6;re++)if(a.mipmaps&&a.mipmaps.length>0)for(let Pe=0;Pe<a.mipmaps.length;Pe++)Q(M.__webglFramebuffer[re][Pe],u,a,e.COLOR_ATTACHMENT0,e.TEXTURE_CUBE_MAP_POSITIVE_X+re,Pe);else Q(M.__webglFramebuffer[re],u,a,e.COLOR_ATTACHMENT0,e.TEXTURE_CUBE_MAP_POSITIVE_X+re,0);c(a)&&s(e.TEXTURE_CUBE_MAP),t.unbindTexture()}else if(ge){for(let re=0,Pe=Z.length;re<Pe;re++){const we=Z[re],J=i.get(we);let ne=e.TEXTURE_2D;(u.isWebGL3DRenderTarget||u.isWebGLArrayRenderTarget)&&(ne=u.isWebGL3DRenderTarget?e.TEXTURE_3D:e.TEXTURE_2D_ARRAY),t.bindTexture(ne,J.__webglTexture),j(ne,we),Q(M.__webglFramebuffer,u,we,e.COLOR_ATTACHMENT0+re,ne,0),c(we)&&s(ne)}t.unbindTexture()}else{let re=e.TEXTURE_2D;if((u.isWebGL3DRenderTarget||u.isWebGLArrayRenderTarget)&&(re=u.isWebGL3DRenderTarget?e.TEXTURE_3D:e.TEXTURE_2D_ARRAY),t.bindTexture(re,X.__webglTexture),j(re,a),a.mipmaps&&a.mipmaps.length>0)for(let Pe=0;Pe<a.mipmaps.length;Pe++)Q(M.__webglFramebuffer[Pe],u,a,e.COLOR_ATTACHMENT0,re,Pe);else Q(M.__webglFramebuffer,u,a,e.COLOR_ATTACHMENT0,re,0);c(a)&&s(re),t.unbindTexture()}u.depthBuffer&&Me(u)}function Fe(u){const a=u.textures;for(let M=0,X=a.length;M<X;M++){const Z=a[M];if(c(Z)){const W=_(u),ge=i.get(Z).__webglTexture;t.bindTexture(W,ge),s(W),t.unbindTexture()}}}const He=[],Ie=[];function $e(u){if(u.samples>0){if(Ke(u)===!1){const a=u.textures,M=u.width,X=u.height;let Z=e.COLOR_BUFFER_BIT;const W=u.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT,ge=i.get(u),re=a.length>1;if(re)for(let we=0;we<a.length;we++)t.bindFramebuffer(e.FRAMEBUFFER,ge.__webglMultisampledFramebuffer),e.framebufferRenderbuffer(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0+we,e.RENDERBUFFER,null),t.bindFramebuffer(e.FRAMEBUFFER,ge.__webglFramebuffer),e.framebufferTexture2D(e.DRAW_FRAMEBUFFER,e.COLOR_ATTACHMENT0+we,e.TEXTURE_2D,null,0);t.bindFramebuffer(e.READ_FRAMEBUFFER,ge.__webglMultisampledFramebuffer);const Pe=u.texture.mipmaps;Pe&&Pe.length>0?t.bindFramebuffer(e.DRAW_FRAMEBUFFER,ge.__webglFramebuffer[0]):t.bindFramebuffer(e.DRAW_FRAMEBUFFER,ge.__webglFramebuffer);for(let we=0;we<a.length;we++){if(u.resolveDepthBuffer&&(u.depthBuffer&&(Z|=e.DEPTH_BUFFER_BIT),u.stencilBuffer&&u.resolveStencilBuffer&&(Z|=e.STENCIL_BUFFER_BIT)),re){e.framebufferRenderbuffer(e.READ_FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.RENDERBUFFER,ge.__webglColorRenderbuffer[we]);const J=i.get(a[we]).__webglTexture;e.framebufferTexture2D(e.DRAW_FRAMEBUFFER,e.COLOR_ATTACHMENT0,e.TEXTURE_2D,J,0)}e.blitFramebuffer(0,0,M,X,0,0,M,X,Z,e.NEAREST),P===!0&&(He.length=0,Ie.length=0,He.push(e.COLOR_ATTACHMENT0+we),u.depthBuffer&&u.resolveDepthBuffer===!1&&(He.push(W),Ie.push(W),e.invalidateFramebuffer(e.DRAW_FRAMEBUFFER,Ie)),e.invalidateFramebuffer(e.READ_FRAMEBUFFER,He))}if(t.bindFramebuffer(e.READ_FRAMEBUFFER,null),t.bindFramebuffer(e.DRAW_FRAMEBUFFER,null),re)for(let we=0;we<a.length;we++){t.bindFramebuffer(e.FRAMEBUFFER,ge.__webglMultisampledFramebuffer),e.framebufferRenderbuffer(e.FRAMEBUFFER,e.COLOR_ATTACHMENT0+we,e.RENDERBUFFER,ge.__webglColorRenderbuffer[we]);const J=i.get(a[we]).__webglTexture;t.bindFramebuffer(e.FRAMEBUFFER,ge.__webglFramebuffer),e.framebufferTexture2D(e.DRAW_FRAMEBUFFER,e.COLOR_ATTACHMENT0+we,e.TEXTURE_2D,J,0)}t.bindFramebuffer(e.DRAW_FRAMEBUFFER,ge.__webglMultisampledFramebuffer)}else if(u.depthBuffer&&u.resolveDepthBuffer===!1&&P){const a=u.stencilBuffer?e.DEPTH_STENCIL_ATTACHMENT:e.DEPTH_ATTACHMENT;e.invalidateFramebuffer(e.DRAW_FRAMEBUFFER,[a])}}}function g(u){return Math.min(o.maxSamples,u.samples)}function Ke(u){const a=i.get(u);return u.samples>0&&n.has("WEBGL_multisampled_render_to_texture")===!0&&a.__useRenderToTexture!==!1}function Ve(u){const a=f.render.frame;G.get(u)!==a&&(G.set(u,a),u.update())}function Ye(u,a){const M=u.colorSpace,X=u.format,Z=u.type;return u.isCompressedTexture===!0||u.isVideoTexture===!0||M!==Un&&M!==$t&&(lt.getTransfer(M)===it?(X!==Ut||Z!==Ct)&&tt("WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):rt("WebGLTextures: Unsupported texture color space:",M)),a}function Te(u){return typeof HTMLImageElement<"u"&&u instanceof HTMLImageElement?(A.width=u.naturalWidth||u.width,A.height=u.naturalHeight||u.height):typeof VideoFrame<"u"&&u instanceof VideoFrame?(A.width=u.displayWidth,A.height=u.displayHeight):(A.width=u.width,A.height=u.height),A}this.allocateTextureUnit=V,this.resetTextureUnits=H,this.setTexture2D=K,this.setTexture2DArray=N,this.setTexture3D=F,this.setTextureCube=se,this.rebindTextures=ke,this.setupRenderTarget=Le,this.updateRenderTargetMipmap=Fe,this.updateMultisampleRenderTarget=$e,this.setupDepthRenderbuffer=Me,this.setupFrameBufferTexture=Q,this.useMultisampledRTT=Ke,this.isReversedDepthBuffer=function(){return t.buffers.depth.getReversed()}}function Od(e,n){function t(i,o=$t){let r;const f=lt.getTransfer(o);if(i===Ct)return e.UNSIGNED_BYTE;if(i===Ya)return e.UNSIGNED_SHORT_4_4_4_4;if(i===Ka)return e.UNSIGNED_SHORT_5_5_5_1;if(i===so)return e.UNSIGNED_INT_5_9_9_9_REV;if(i===lo)return e.UNSIGNED_INT_10F_11F_11F_REV;if(i===co)return e.BYTE;if(i===fo)return e.SHORT;if(i===wn)return e.UNSIGNED_SHORT;if(i===$a)return e.INT;if(i===Yt)return e.UNSIGNED_INT;if(i===Ot)return e.FLOAT;if(i===Gt)return e.HALF_FLOAT;if(i===uo)return e.ALPHA;if(i===po)return e.RGB;if(i===Ut)return e.RGBA;if(i===an)return e.DEPTH_COMPONENT;if(i===Qt)return e.DEPTH_STENCIL;if(i===ho)return e.RED;if(i===Xa)return e.RED_INTEGER;if(i===mn)return e.RG;if(i===za)return e.RG_INTEGER;if(i===Wa)return e.RGBA_INTEGER;if(i===Hn||i===Vn||i===kn||i===Wn)if(f===it)if(r=n.get("WEBGL_compressed_texture_s3tc_srgb"),r!==null){if(i===Hn)return r.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(i===Vn)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(i===kn)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(i===Wn)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(r=n.get("WEBGL_compressed_texture_s3tc"),r!==null){if(i===Hn)return r.COMPRESSED_RGB_S3TC_DXT1_EXT;if(i===Vn)return r.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(i===kn)return r.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(i===Wn)return r.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(i===Ti||i===Ai||i===Ri||i===bi)if(r=n.get("WEBGL_compressed_texture_pvrtc"),r!==null){if(i===Ti)return r.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(i===Ai)return r.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(i===Ri)return r.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(i===bi)return r.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(i===Ci||i===Pi||i===Di||i===Li||i===wi||i===Ui||i===Ii)if(r=n.get("WEBGL_compressed_texture_etc"),r!==null){if(i===Ci||i===Pi)return f===it?r.COMPRESSED_SRGB8_ETC2:r.COMPRESSED_RGB8_ETC2;if(i===Di)return f===it?r.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:r.COMPRESSED_RGBA8_ETC2_EAC;if(i===Li)return r.COMPRESSED_R11_EAC;if(i===wi)return r.COMPRESSED_SIGNED_R11_EAC;if(i===Ui)return r.COMPRESSED_RG11_EAC;if(i===Ii)return r.COMPRESSED_SIGNED_RG11_EAC}else return null;if(i===yi||i===Ni||i===Fi||i===Oi||i===Bi||i===Gi||i===Hi||i===Vi||i===ki||i===Wi||i===zi||i===Xi||i===Yi||i===Ki)if(r=n.get("WEBGL_compressed_texture_astc"),r!==null){if(i===yi)return f===it?r.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:r.COMPRESSED_RGBA_ASTC_4x4_KHR;if(i===Ni)return f===it?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:r.COMPRESSED_RGBA_ASTC_5x4_KHR;if(i===Fi)return f===it?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:r.COMPRESSED_RGBA_ASTC_5x5_KHR;if(i===Oi)return f===it?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:r.COMPRESSED_RGBA_ASTC_6x5_KHR;if(i===Bi)return f===it?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:r.COMPRESSED_RGBA_ASTC_6x6_KHR;if(i===Gi)return f===it?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:r.COMPRESSED_RGBA_ASTC_8x5_KHR;if(i===Hi)return f===it?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:r.COMPRESSED_RGBA_ASTC_8x6_KHR;if(i===Vi)return f===it?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:r.COMPRESSED_RGBA_ASTC_8x8_KHR;if(i===ki)return f===it?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:r.COMPRESSED_RGBA_ASTC_10x5_KHR;if(i===Wi)return f===it?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:r.COMPRESSED_RGBA_ASTC_10x6_KHR;if(i===zi)return f===it?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:r.COMPRESSED_RGBA_ASTC_10x8_KHR;if(i===Xi)return f===it?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:r.COMPRESSED_RGBA_ASTC_10x10_KHR;if(i===Yi)return f===it?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:r.COMPRESSED_RGBA_ASTC_12x10_KHR;if(i===Ki)return f===it?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:r.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(i===qi||i===Zi||i===$i)if(r=n.get("EXT_texture_compression_bptc"),r!==null){if(i===qi)return f===it?r.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:r.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(i===Zi)return r.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(i===$i)return r.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(i===ji||i===Qi||i===Ji||i===ea)if(r=n.get("EXT_texture_compression_rgtc"),r!==null){if(i===ji)return r.COMPRESSED_RED_RGTC1_EXT;if(i===Qi)return r.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(i===Ji)return r.COMPRESSED_RED_GREEN_RGTC2_EXT;if(i===ea)return r.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return i===hn?e.UNSIGNED_INT_24_8:e[i]!==void 0?e[i]:null}return{convert:t}}const Bd=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,Gd=`
uniform sampler2DArray depthColor;
uniform float depthWidth;
uniform float depthHeight;

void main() {

	vec2 coord = vec2( gl_FragCoord.x / depthWidth, gl_FragCoord.y / depthHeight );

	if ( coord.x >= 1.0 ) {

		gl_FragDepth = texture( depthColor, vec3( coord.x - 1.0, coord.y, 1 ) ).r;

	} else {

		gl_FragDepth = texture( depthColor, vec3( coord.x, coord.y, 0 ) ).r;

	}

}`;class Hd{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(n,t){if(this.texture===null){const i=new qa(n.texture);(n.depthNear!==t.depthNear||n.depthFar!==t.depthFar)&&(this.depthNear=n.depthNear,this.depthFar=n.depthFar),this.texture=i}}getMesh(n){if(this.texture!==null&&this.mesh===null){const t=n.cameras[0].viewport,i=new yt({vertexShader:Bd,fragmentShader:Gd,uniforms:{depthColor:{value:this.texture},depthWidth:{value:t.z},depthHeight:{value:t.w}}});this.mesh=new vt(new Za(20,20),i)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}}class Vd extends Pr{constructor(n,t){super();const i=this;let o=null,r=1,f=null,m="local-floor",P=1,A=null,G=null,D=null,h=null,x=null,S=null;const I=typeof XRWebGLBinding<"u",c=new Hd,s={},_=t.getContextAttributes();let T=null,v=null;const y=[],C=[],U=new at;let d=null;const p=new un;p.viewport=new gt;const $=new un;$.viewport=new gt;const R=[p,$],H=new Dr;let V=null,z=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(B){let q=y[B];return q===void 0&&(q=new Bn,y[B]=q),q.getTargetRaySpace()},this.getControllerGrip=function(B){let q=y[B];return q===void 0&&(q=new Bn,y[B]=q),q.getGripSpace()},this.getHand=function(B){let q=y[B];return q===void 0&&(q=new Bn,y[B]=q),q.getHandSpace()};function K(B){const q=C.indexOf(B.inputSource);if(q===-1)return;const Q=y[q];Q!==void 0&&(Q.update(B.inputSource,B.frame,A||f),Q.dispatchEvent({type:B.type,data:B.inputSource}))}function N(){o.removeEventListener("select",K),o.removeEventListener("selectstart",K),o.removeEventListener("selectend",K),o.removeEventListener("squeeze",K),o.removeEventListener("squeezestart",K),o.removeEventListener("squeezeend",K),o.removeEventListener("end",N),o.removeEventListener("inputsourceschange",F);for(let B=0;B<y.length;B++){const q=C[B];q!==null&&(C[B]=null,y[B].disconnect(q))}V=null,z=null,c.reset();for(const B in s)delete s[B];n.setRenderTarget(T),x=null,h=null,D=null,o=null,v=null,me.stop(),i.isPresenting=!1,n.setPixelRatio(d),n.setSize(U.width,U.height,!1),i.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(B){r=B,i.isPresenting===!0&&tt("WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(B){m=B,i.isPresenting===!0&&tt("WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return A||f},this.setReferenceSpace=function(B){A=B},this.getBaseLayer=function(){return h!==null?h:x},this.getBinding=function(){return D===null&&I&&(D=new XRWebGLBinding(o,t)),D},this.getFrame=function(){return S},this.getSession=function(){return o},this.setSession=async function(B){if(o=B,o!==null){if(T=n.getRenderTarget(),o.addEventListener("select",K),o.addEventListener("selectstart",K),o.addEventListener("selectend",K),o.addEventListener("squeeze",K),o.addEventListener("squeezestart",K),o.addEventListener("squeezeend",K),o.addEventListener("end",N),o.addEventListener("inputsourceschange",F),_.xrCompatible!==!0&&await t.makeXRCompatible(),d=n.getPixelRatio(),n.getSize(U),I&&"createProjectionLayer"in XRWebGLBinding.prototype){let Q=null,De=null,_e=null;_.depth&&(_e=_.stencil?t.DEPTH24_STENCIL8:t.DEPTH_COMPONENT24,Q=_.stencil?Qt:an,De=_.stencil?hn:Yt);const Me={colorFormat:t.RGBA8,depthFormat:_e,scaleFactor:r};D=this.getBinding(),h=D.createProjectionLayer(Me),o.updateRenderState({layers:[h]}),n.setPixelRatio(1),n.setSize(h.textureWidth,h.textureHeight,!1),v=new Dt(h.textureWidth,h.textureHeight,{format:Ut,type:Ct,depthTexture:new Ln(h.textureWidth,h.textureHeight,De,void 0,void 0,void 0,void 0,void 0,void 0,Q),stencilBuffer:_.stencil,colorSpace:n.outputColorSpace,samples:_.antialias?4:0,resolveDepthBuffer:h.ignoreDepthValues===!1,resolveStencilBuffer:h.ignoreDepthValues===!1})}else{const Q={antialias:_.antialias,alpha:!0,depth:_.depth,stencil:_.stencil,framebufferScaleFactor:r};x=new XRWebGLLayer(o,t,Q),o.updateRenderState({baseLayer:x}),n.setPixelRatio(1),n.setSize(x.framebufferWidth,x.framebufferHeight,!1),v=new Dt(x.framebufferWidth,x.framebufferHeight,{format:Ut,type:Ct,colorSpace:n.outputColorSpace,stencilBuffer:_.stencil,resolveDepthBuffer:x.ignoreDepthValues===!1,resolveStencilBuffer:x.ignoreDepthValues===!1})}v.isXRRenderTarget=!0,this.setFoveation(P),A=null,f=await o.requestReferenceSpace(m),me.setContext(o),me.start(),i.isPresenting=!0,i.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(o!==null)return o.environmentBlendMode},this.getDepthTexture=function(){return c.getDepthTexture()};function F(B){for(let q=0;q<B.removed.length;q++){const Q=B.removed[q],De=C.indexOf(Q);De>=0&&(C[De]=null,y[De].disconnect(Q))}for(let q=0;q<B.added.length;q++){const Q=B.added[q];let De=C.indexOf(Q);if(De===-1){for(let Me=0;Me<y.length;Me++)if(Me>=C.length){C.push(Q),De=Me;break}else if(C[Me]===null){C[Me]=Q,De=Me;break}if(De===-1)break}const _e=y[De];_e&&_e.connect(Q)}}const se=new Ue,Y=new Ue;function ae(B,q,Q){se.setFromMatrixPosition(q.matrixWorld),Y.setFromMatrixPosition(Q.matrixWorld);const De=se.distanceTo(Y),_e=q.projectionMatrix.elements,Me=Q.projectionMatrix.elements,ke=_e[14]/(_e[10]-1),Le=_e[14]/(_e[10]+1),Fe=(_e[9]+1)/_e[5],He=(_e[9]-1)/_e[5],Ie=(_e[8]-1)/_e[0],$e=(Me[8]+1)/Me[0],g=ke*Ie,Ke=ke*$e,Ve=De/(-Ie+$e),Ye=Ve*-Ie;if(q.matrixWorld.decompose(B.position,B.quaternion,B.scale),B.translateX(Ye),B.translateZ(Ve),B.matrixWorld.compose(B.position,B.quaternion,B.scale),B.matrixWorldInverse.copy(B.matrixWorld).invert(),_e[10]===-1)B.projectionMatrix.copy(q.projectionMatrix),B.projectionMatrixInverse.copy(q.projectionMatrixInverse);else{const Te=ke+Ve,u=Le+Ve,a=g-Ye,M=Ke+(De-Ye),X=Fe*Le/u*Te,Z=He*Le/u*Te;B.projectionMatrix.makePerspective(a,M,X,Z,Te,u),B.projectionMatrixInverse.copy(B.projectionMatrix).invert()}}function te(B,q){q===null?B.matrixWorld.copy(B.matrix):B.matrixWorld.multiplyMatrices(q.matrixWorld,B.matrix),B.matrixWorldInverse.copy(B.matrixWorld).invert()}this.updateCamera=function(B){if(o===null)return;let q=B.near,Q=B.far;c.texture!==null&&(c.depthNear>0&&(q=c.depthNear),c.depthFar>0&&(Q=c.depthFar)),H.near=$.near=p.near=q,H.far=$.far=p.far=Q,(V!==H.near||z!==H.far)&&(o.updateRenderState({depthNear:H.near,depthFar:H.far}),V=H.near,z=H.far),H.layers.mask=B.layers.mask|6,p.layers.mask=H.layers.mask&-5,$.layers.mask=H.layers.mask&-3;const De=B.parent,_e=H.cameras;te(H,De);for(let Me=0;Me<_e.length;Me++)te(_e[Me],De);_e.length===2?ae(H,p,$):H.projectionMatrix.copy(p.projectionMatrix),j(B,H,De)};function j(B,q,Q){Q===null?B.matrix.copy(q.matrixWorld):(B.matrix.copy(Q.matrixWorld),B.matrix.invert(),B.matrix.multiply(q.matrixWorld)),B.matrix.decompose(B.position,B.quaternion,B.scale),B.updateMatrixWorld(!0),B.projectionMatrix.copy(q.projectionMatrix),B.projectionMatrixInverse.copy(q.projectionMatrixInverse),B.isPerspectiveCamera&&(B.fov=Lr*2*Math.atan(1/B.projectionMatrix.elements[5]),B.zoom=1)}this.getCamera=function(){return H},this.getFoveation=function(){if(!(h===null&&x===null))return P},this.setFoveation=function(B){P=B,h!==null&&(h.fixedFoveation=B),x!==null&&x.fixedFoveation!==void 0&&(x.fixedFoveation=B)},this.hasDepthSensing=function(){return c.texture!==null},this.getDepthSensingMesh=function(){return c.getMesh(H)},this.getCameraTexture=function(B){return s[B]};let de=null;function Ce(B,q){if(G=q.getViewerPose(A||f),S=q,G!==null){const Q=G.views;x!==null&&(n.setRenderTargetFramebuffer(v,x.framebuffer),n.setRenderTarget(v));let De=!1;Q.length!==H.cameras.length&&(H.cameras.length=0,De=!0);for(let Le=0;Le<Q.length;Le++){const Fe=Q[Le];let He=null;if(x!==null)He=x.getViewport(Fe);else{const $e=D.getViewSubImage(h,Fe);He=$e.viewport,Le===0&&(n.setRenderTargetTextures(v,$e.colorTexture,$e.depthStencilTexture),n.setRenderTarget(v))}let Ie=R[Le];Ie===void 0&&(Ie=new un,Ie.layers.enable(Le),Ie.viewport=new gt,R[Le]=Ie),Ie.matrix.fromArray(Fe.transform.matrix),Ie.matrix.decompose(Ie.position,Ie.quaternion,Ie.scale),Ie.projectionMatrix.fromArray(Fe.projectionMatrix),Ie.projectionMatrixInverse.copy(Ie.projectionMatrix).invert(),Ie.viewport.set(He.x,He.y,He.width,He.height),Le===0&&(H.matrix.copy(Ie.matrix),H.matrix.decompose(H.position,H.quaternion,H.scale)),De===!0&&H.cameras.push(Ie)}const _e=o.enabledFeatures;if(_e&&_e.includes("depth-sensing")&&o.depthUsage=="gpu-optimized"&&I){D=i.getBinding();const Le=D.getDepthInformation(Q[0]);Le&&Le.isValid&&Le.texture&&c.init(Le,o.renderState)}if(_e&&_e.includes("camera-access")&&I){n.state.unbindTexture(),D=i.getBinding();for(let Le=0;Le<Q.length;Le++){const Fe=Q[Le].camera;if(Fe){let He=s[Fe];He||(He=new qa,s[Fe]=He);const Ie=D.getCameraImage(Fe);He.sourceTexture=Ie}}}}for(let Q=0;Q<y.length;Q++){const De=C[Q],_e=y[Q];De!==null&&_e!==void 0&&_e.update(De,q,A||f)}de&&de(B,q),q.detectedPlanes&&i.dispatchEvent({type:"planesdetected",data:q}),S=null}const me=new cr;me.setAnimationLoop(Ce),this.setAnimationLoop=function(B){de=B},this.dispose=function(){}}}const Wt=new Ja,kd=new tn;function Wd(e,n){function t(c,s){c.matrixAutoUpdate===!0&&c.updateMatrix(),s.value.copy(c.matrix)}function i(c,s){s.color.getRGB(c.fogColor.value,Qa(e)),s.isFog?(c.fogNear.value=s.near,c.fogFar.value=s.far):s.isFogExp2&&(c.fogDensity.value=s.density)}function o(c,s,_,T,v){s.isMeshBasicMaterial?r(c,s):s.isMeshLambertMaterial?(r(c,s),s.envMap&&(c.envMapIntensity.value=s.envMapIntensity)):s.isMeshToonMaterial?(r(c,s),D(c,s)):s.isMeshPhongMaterial?(r(c,s),G(c,s),s.envMap&&(c.envMapIntensity.value=s.envMapIntensity)):s.isMeshStandardMaterial?(r(c,s),h(c,s),s.isMeshPhysicalMaterial&&x(c,s,v)):s.isMeshMatcapMaterial?(r(c,s),S(c,s)):s.isMeshDepthMaterial?r(c,s):s.isMeshDistanceMaterial?(r(c,s),I(c,s)):s.isMeshNormalMaterial?r(c,s):s.isLineBasicMaterial?(f(c,s),s.isLineDashedMaterial&&m(c,s)):s.isPointsMaterial?P(c,s,_,T):s.isSpriteMaterial?A(c,s):s.isShadowMaterial?(c.color.value.copy(s.color),c.opacity.value=s.opacity):s.isShaderMaterial&&(s.uniformsNeedUpdate=!1)}function r(c,s){c.opacity.value=s.opacity,s.color&&c.diffuse.value.copy(s.color),s.emissive&&c.emissive.value.copy(s.emissive).multiplyScalar(s.emissiveIntensity),s.map&&(c.map.value=s.map,t(s.map,c.mapTransform)),s.alphaMap&&(c.alphaMap.value=s.alphaMap,t(s.alphaMap,c.alphaMapTransform)),s.bumpMap&&(c.bumpMap.value=s.bumpMap,t(s.bumpMap,c.bumpMapTransform),c.bumpScale.value=s.bumpScale,s.side===Mt&&(c.bumpScale.value*=-1)),s.normalMap&&(c.normalMap.value=s.normalMap,t(s.normalMap,c.normalMapTransform),c.normalScale.value.copy(s.normalScale),s.side===Mt&&c.normalScale.value.negate()),s.displacementMap&&(c.displacementMap.value=s.displacementMap,t(s.displacementMap,c.displacementMapTransform),c.displacementScale.value=s.displacementScale,c.displacementBias.value=s.displacementBias),s.emissiveMap&&(c.emissiveMap.value=s.emissiveMap,t(s.emissiveMap,c.emissiveMapTransform)),s.specularMap&&(c.specularMap.value=s.specularMap,t(s.specularMap,c.specularMapTransform)),s.alphaTest>0&&(c.alphaTest.value=s.alphaTest);const _=n.get(s),T=_.envMap,v=_.envMapRotation;T&&(c.envMap.value=T,Wt.copy(v),Wt.x*=-1,Wt.y*=-1,Wt.z*=-1,T.isCubeTexture&&T.isRenderTargetTexture===!1&&(Wt.y*=-1,Wt.z*=-1),c.envMapRotation.value.setFromMatrix4(kd.makeRotationFromEuler(Wt)),c.flipEnvMap.value=T.isCubeTexture&&T.isRenderTargetTexture===!1?-1:1,c.reflectivity.value=s.reflectivity,c.ior.value=s.ior,c.refractionRatio.value=s.refractionRatio),s.lightMap&&(c.lightMap.value=s.lightMap,c.lightMapIntensity.value=s.lightMapIntensity,t(s.lightMap,c.lightMapTransform)),s.aoMap&&(c.aoMap.value=s.aoMap,c.aoMapIntensity.value=s.aoMapIntensity,t(s.aoMap,c.aoMapTransform))}function f(c,s){c.diffuse.value.copy(s.color),c.opacity.value=s.opacity,s.map&&(c.map.value=s.map,t(s.map,c.mapTransform))}function m(c,s){c.dashSize.value=s.dashSize,c.totalSize.value=s.dashSize+s.gapSize,c.scale.value=s.scale}function P(c,s,_,T){c.diffuse.value.copy(s.color),c.opacity.value=s.opacity,c.size.value=s.size*_,c.scale.value=T*.5,s.map&&(c.map.value=s.map,t(s.map,c.uvTransform)),s.alphaMap&&(c.alphaMap.value=s.alphaMap,t(s.alphaMap,c.alphaMapTransform)),s.alphaTest>0&&(c.alphaTest.value=s.alphaTest)}function A(c,s){c.diffuse.value.copy(s.color),c.opacity.value=s.opacity,c.rotation.value=s.rotation,s.map&&(c.map.value=s.map,t(s.map,c.mapTransform)),s.alphaMap&&(c.alphaMap.value=s.alphaMap,t(s.alphaMap,c.alphaMapTransform)),s.alphaTest>0&&(c.alphaTest.value=s.alphaTest)}function G(c,s){c.specular.value.copy(s.specular),c.shininess.value=Math.max(s.shininess,1e-4)}function D(c,s){s.gradientMap&&(c.gradientMap.value=s.gradientMap)}function h(c,s){c.metalness.value=s.metalness,s.metalnessMap&&(c.metalnessMap.value=s.metalnessMap,t(s.metalnessMap,c.metalnessMapTransform)),c.roughness.value=s.roughness,s.roughnessMap&&(c.roughnessMap.value=s.roughnessMap,t(s.roughnessMap,c.roughnessMapTransform)),s.envMap&&(c.envMapIntensity.value=s.envMapIntensity)}function x(c,s,_){c.ior.value=s.ior,s.sheen>0&&(c.sheenColor.value.copy(s.sheenColor).multiplyScalar(s.sheen),c.sheenRoughness.value=s.sheenRoughness,s.sheenColorMap&&(c.sheenColorMap.value=s.sheenColorMap,t(s.sheenColorMap,c.sheenColorMapTransform)),s.sheenRoughnessMap&&(c.sheenRoughnessMap.value=s.sheenRoughnessMap,t(s.sheenRoughnessMap,c.sheenRoughnessMapTransform))),s.clearcoat>0&&(c.clearcoat.value=s.clearcoat,c.clearcoatRoughness.value=s.clearcoatRoughness,s.clearcoatMap&&(c.clearcoatMap.value=s.clearcoatMap,t(s.clearcoatMap,c.clearcoatMapTransform)),s.clearcoatRoughnessMap&&(c.clearcoatRoughnessMap.value=s.clearcoatRoughnessMap,t(s.clearcoatRoughnessMap,c.clearcoatRoughnessMapTransform)),s.clearcoatNormalMap&&(c.clearcoatNormalMap.value=s.clearcoatNormalMap,t(s.clearcoatNormalMap,c.clearcoatNormalMapTransform),c.clearcoatNormalScale.value.copy(s.clearcoatNormalScale),s.side===Mt&&c.clearcoatNormalScale.value.negate())),s.dispersion>0&&(c.dispersion.value=s.dispersion),s.iridescence>0&&(c.iridescence.value=s.iridescence,c.iridescenceIOR.value=s.iridescenceIOR,c.iridescenceThicknessMinimum.value=s.iridescenceThicknessRange[0],c.iridescenceThicknessMaximum.value=s.iridescenceThicknessRange[1],s.iridescenceMap&&(c.iridescenceMap.value=s.iridescenceMap,t(s.iridescenceMap,c.iridescenceMapTransform)),s.iridescenceThicknessMap&&(c.iridescenceThicknessMap.value=s.iridescenceThicknessMap,t(s.iridescenceThicknessMap,c.iridescenceThicknessMapTransform))),s.transmission>0&&(c.transmission.value=s.transmission,c.transmissionSamplerMap.value=_.texture,c.transmissionSamplerSize.value.set(_.width,_.height),s.transmissionMap&&(c.transmissionMap.value=s.transmissionMap,t(s.transmissionMap,c.transmissionMapTransform)),c.thickness.value=s.thickness,s.thicknessMap&&(c.thicknessMap.value=s.thicknessMap,t(s.thicknessMap,c.thicknessMapTransform)),c.attenuationDistance.value=s.attenuationDistance,c.attenuationColor.value.copy(s.attenuationColor)),s.anisotropy>0&&(c.anisotropyVector.value.set(s.anisotropy*Math.cos(s.anisotropyRotation),s.anisotropy*Math.sin(s.anisotropyRotation)),s.anisotropyMap&&(c.anisotropyMap.value=s.anisotropyMap,t(s.anisotropyMap,c.anisotropyMapTransform))),c.specularIntensity.value=s.specularIntensity,c.specularColor.value.copy(s.specularColor),s.specularColorMap&&(c.specularColorMap.value=s.specularColorMap,t(s.specularColorMap,c.specularColorMapTransform)),s.specularIntensityMap&&(c.specularIntensityMap.value=s.specularIntensityMap,t(s.specularIntensityMap,c.specularIntensityMapTransform))}function S(c,s){s.matcap&&(c.matcap.value=s.matcap)}function I(c,s){const _=n.get(s).light;c.referencePosition.value.setFromMatrixPosition(_.matrixWorld),c.nearDistance.value=_.shadow.camera.near,c.farDistance.value=_.shadow.camera.far}return{refreshFogUniforms:i,refreshMaterialUniforms:o}}function zd(e,n,t,i){let o={},r={},f=[];const m=e.getParameter(e.MAX_UNIFORM_BUFFER_BINDINGS);function P(_,T){const v=T.program;i.uniformBlockBinding(_,v)}function A(_,T){let v=o[_.id];v===void 0&&(S(_),v=G(_),o[_.id]=v,_.addEventListener("dispose",c));const y=T.program;i.updateUBOMapping(_,y);const C=n.render.frame;r[_.id]!==C&&(h(_),r[_.id]=C)}function G(_){const T=D();_.__bindingPointIndex=T;const v=e.createBuffer(),y=_.__size,C=_.usage;return e.bindBuffer(e.UNIFORM_BUFFER,v),e.bufferData(e.UNIFORM_BUFFER,y,C),e.bindBuffer(e.UNIFORM_BUFFER,null),e.bindBufferBase(e.UNIFORM_BUFFER,T,v),v}function D(){for(let _=0;_<m;_++)if(f.indexOf(_)===-1)return f.push(_),_;return rt("WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function h(_){const T=o[_.id],v=_.uniforms,y=_.__cache;e.bindBuffer(e.UNIFORM_BUFFER,T);for(let C=0,U=v.length;C<U;C++){const d=Array.isArray(v[C])?v[C]:[v[C]];for(let p=0,$=d.length;p<$;p++){const R=d[p];if(x(R,C,p,y)===!0){const H=R.__offset,V=Array.isArray(R.value)?R.value:[R.value];let z=0;for(let K=0;K<V.length;K++){const N=V[K],F=I(N);typeof N=="number"||typeof N=="boolean"?(R.__data[0]=N,e.bufferSubData(e.UNIFORM_BUFFER,H+z,R.__data)):N.isMatrix3?(R.__data[0]=N.elements[0],R.__data[1]=N.elements[1],R.__data[2]=N.elements[2],R.__data[3]=0,R.__data[4]=N.elements[3],R.__data[5]=N.elements[4],R.__data[6]=N.elements[5],R.__data[7]=0,R.__data[8]=N.elements[6],R.__data[9]=N.elements[7],R.__data[10]=N.elements[8],R.__data[11]=0):(N.toArray(R.__data,z),z+=F.storage/Float32Array.BYTES_PER_ELEMENT)}e.bufferSubData(e.UNIFORM_BUFFER,H,R.__data)}}}e.bindBuffer(e.UNIFORM_BUFFER,null)}function x(_,T,v,y){const C=_.value,U=T+"_"+v;if(y[U]===void 0)return typeof C=="number"||typeof C=="boolean"?y[U]=C:y[U]=C.clone(),!0;{const d=y[U];if(typeof C=="number"||typeof C=="boolean"){if(d!==C)return y[U]=C,!0}else if(d.equals(C)===!1)return d.copy(C),!0}return!1}function S(_){const T=_.uniforms;let v=0;const y=16;for(let U=0,d=T.length;U<d;U++){const p=Array.isArray(T[U])?T[U]:[T[U]];for(let $=0,R=p.length;$<R;$++){const H=p[$],V=Array.isArray(H.value)?H.value:[H.value];for(let z=0,K=V.length;z<K;z++){const N=V[z],F=I(N),se=v%y,Y=se%F.boundary,ae=se+Y;v+=Y,ae!==0&&y-ae<F.storage&&(v+=y-ae),H.__data=new Float32Array(F.storage/Float32Array.BYTES_PER_ELEMENT),H.__offset=v,v+=F.storage}}}const C=v%y;return C>0&&(v+=y-C),_.__size=v,_.__cache={},this}function I(_){const T={boundary:0,storage:0};return typeof _=="number"||typeof _=="boolean"?(T.boundary=4,T.storage=4):_.isVector2?(T.boundary=8,T.storage=8):_.isVector3||_.isColor?(T.boundary=16,T.storage=12):_.isVector4?(T.boundary=16,T.storage=16):_.isMatrix3?(T.boundary=48,T.storage=48):_.isMatrix4?(T.boundary=64,T.storage=64):_.isTexture?tt("WebGLRenderer: Texture samplers can not be part of an uniforms group."):tt("WebGLRenderer: Unsupported uniform value type.",_),T}function c(_){const T=_.target;T.removeEventListener("dispose",c);const v=f.indexOf(T.__bindingPointIndex);f.splice(v,1),e.deleteBuffer(o[T.id]),delete o[T.id],delete r[T.id]}function s(){for(const _ in o)e.deleteBuffer(o[_]);f=[],o={},r={}}return{bind:P,update:A,dispose:s}}const Xd=new Uint16Array([12469,15057,12620,14925,13266,14620,13807,14376,14323,13990,14545,13625,14713,13328,14840,12882,14931,12528,14996,12233,15039,11829,15066,11525,15080,11295,15085,10976,15082,10705,15073,10495,13880,14564,13898,14542,13977,14430,14158,14124,14393,13732,14556,13410,14702,12996,14814,12596,14891,12291,14937,11834,14957,11489,14958,11194,14943,10803,14921,10506,14893,10278,14858,9960,14484,14039,14487,14025,14499,13941,14524,13740,14574,13468,14654,13106,14743,12678,14818,12344,14867,11893,14889,11509,14893,11180,14881,10751,14852,10428,14812,10128,14765,9754,14712,9466,14764,13480,14764,13475,14766,13440,14766,13347,14769,13070,14786,12713,14816,12387,14844,11957,14860,11549,14868,11215,14855,10751,14825,10403,14782,10044,14729,9651,14666,9352,14599,9029,14967,12835,14966,12831,14963,12804,14954,12723,14936,12564,14917,12347,14900,11958,14886,11569,14878,11247,14859,10765,14828,10401,14784,10011,14727,9600,14660,9289,14586,8893,14508,8533,15111,12234,15110,12234,15104,12216,15092,12156,15067,12010,15028,11776,14981,11500,14942,11205,14902,10752,14861,10393,14812,9991,14752,9570,14682,9252,14603,8808,14519,8445,14431,8145,15209,11449,15208,11451,15202,11451,15190,11438,15163,11384,15117,11274,15055,10979,14994,10648,14932,10343,14871,9936,14803,9532,14729,9218,14645,8742,14556,8381,14461,8020,14365,7603,15273,10603,15272,10607,15267,10619,15256,10631,15231,10614,15182,10535,15118,10389,15042,10167,14963,9787,14883,9447,14800,9115,14710,8665,14615,8318,14514,7911,14411,7507,14279,7198,15314,9675,15313,9683,15309,9712,15298,9759,15277,9797,15229,9773,15166,9668,15084,9487,14995,9274,14898,8910,14800,8539,14697,8234,14590,7790,14479,7409,14367,7067,14178,6621,15337,8619,15337,8631,15333,8677,15325,8769,15305,8871,15264,8940,15202,8909,15119,8775,15022,8565,14916,8328,14804,8009,14688,7614,14569,7287,14448,6888,14321,6483,14088,6171,15350,7402,15350,7419,15347,7480,15340,7613,15322,7804,15287,7973,15229,8057,15148,8012,15046,7846,14933,7611,14810,7357,14682,7069,14552,6656,14421,6316,14251,5948,14007,5528,15356,5942,15356,5977,15353,6119,15348,6294,15332,6551,15302,6824,15249,7044,15171,7122,15070,7050,14949,6861,14818,6611,14679,6349,14538,6067,14398,5651,14189,5311,13935,4958,15359,4123,15359,4153,15356,4296,15353,4646,15338,5160,15311,5508,15263,5829,15188,6042,15088,6094,14966,6001,14826,5796,14678,5543,14527,5287,14377,4985,14133,4586,13869,4257,15360,1563,15360,1642,15358,2076,15354,2636,15341,3350,15317,4019,15273,4429,15203,4732,15105,4911,14981,4932,14836,4818,14679,4621,14517,4386,14359,4156,14083,3795,13808,3437,15360,122,15360,137,15358,285,15355,636,15344,1274,15322,2177,15281,2765,15215,3223,15120,3451,14995,3569,14846,3567,14681,3466,14511,3305,14344,3121,14037,2800,13753,2467,15360,0,15360,1,15359,21,15355,89,15346,253,15325,479,15287,796,15225,1148,15133,1492,15008,1749,14856,1882,14685,1886,14506,1783,14324,1608,13996,1398,13702,1183]);let Rt=null;function Yd(){return Rt===null&&(Rt=new wr(Xd,16,16,mn,Gt),Rt.name="DFG_LUT",Rt.minFilter=xt,Rt.magFilter=xt,Rt.wrapS=ii,Rt.wrapT=ii,Rt.generateMipmaps=!1,Rt.needsUpdate=!0),Rt}class Kd{constructor(n={}){const{canvas:t=Tr(),context:i=null,depth:o=!0,stencil:r=!1,alpha:f=!1,antialias:m=!1,premultipliedAlpha:P=!0,preserveDrawingBuffer:A=!1,powerPreference:G="default",failIfMajorPerformanceCaveat:D=!1,reversedDepthBuffer:h=!1,outputBufferType:x=Ct}=n;this.isWebGLRenderer=!0;let S;if(i!==null){if(typeof WebGLRenderingContext<"u"&&i instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");S=i.getContextAttributes().alpha}else S=f;const I=x,c=new Set([Wa,za,Xa]),s=new Set([Ct,Yt,wn,hn,Ya,Ka]),_=new Uint32Array(4),T=new Int32Array(4);let v=null,y=null;const C=[],U=[];let d=null;this.domElement=t,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=Pt,this.toneMappingExposure=1,this.transmissionResolutionScale=1;const p=this;let $=!1;this._outputColorSpace=Ar;let R=0,H=0,V=null,z=-1,K=null;const N=new gt,F=new gt;let se=null;const Y=new Xe(0);let ae=0,te=t.width,j=t.height,de=1,Ce=null,me=null;const B=new gt(0,0,te,j),q=new gt(0,0,te,j);let Q=!1;const De=new Ba;let _e=!1,Me=!1;const ke=new tn,Le=new Ue,Fe=new gt,He={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0};let Ie=!1;function $e(){return V===null?de:1}let g=i;function Ke(l,b){return t.getContext(l,b)}try{const l={alpha:!0,depth:o,stencil:r,antialias:m,premultipliedAlpha:P,preserveDrawingBuffer:A,powerPreference:G,failIfMajorPerformanceCaveat:D};if("setAttribute"in t&&t.setAttribute("data-engine",`three.js r${Rr}`),t.addEventListener("webglcontextlost",Se,!1),t.addEventListener("webglcontextrestored",ye,!1),t.addEventListener("webglcontextcreationerror",nt,!1),g===null){const b="webgl2";if(g=Ke(b,l),g===null)throw Ke(b)?new Error("Error creating WebGL context with your selected attributes."):new Error("Error creating WebGL context.")}}catch(l){throw rt("WebGLRenderer: "+l.message),l}let Ve,Ye,Te,u,a,M,X,Z,W,ge,re,Pe,we,J,ne,ve,Ee,ue,Be,E,oe,ie,he;function ee(){Ve=new Yc(g),Ve.init(),oe=new Od(g,Ve),Ye=new Bc(g,Ve,n,oe),Te=new Nd(g,Ve),Ye.reversedDepthBuffer&&h&&Te.buffers.depth.setReversed(!0),u=new Zc(g),a=new xd,M=new Fd(g,Ve,Te,a,Ye,oe,u),X=new Xc(p),Z=new es(g),ie=new Fc(g,Z),W=new Kc(g,Z,u,ie),ge=new jc(g,W,Z,ie,u),ue=new $c(g,Ye,M),ne=new Gc(a),re=new Ed(p,X,Ve,Ye,ie,ne),Pe=new Wd(p,a),we=new Td,J=new Dd(Ve),Ee=new Nc(p,X,Te,ge,S,P),ve=new yd(p,ge,Ye),he=new zd(g,u,Ye,Te),Be=new Oc(g,Ve,u),E=new qc(g,Ve,u),u.programs=re.programs,p.capabilities=Ye,p.extensions=Ve,p.properties=a,p.renderLists=we,p.shadowMap=ve,p.state=Te,p.info=u}ee(),I!==Ct&&(d=new Jc(I,t.width,t.height,o,r));const k=new Vd(p,g);this.xr=k,this.getContext=function(){return g},this.getContextAttributes=function(){return g.getContextAttributes()},this.forceContextLoss=function(){const l=Ve.get("WEBGL_lose_context");l&&l.loseContext()},this.forceContextRestore=function(){const l=Ve.get("WEBGL_lose_context");l&&l.restoreContext()},this.getPixelRatio=function(){return de},this.setPixelRatio=function(l){l!==void 0&&(de=l,this.setSize(te,j,!1))},this.getSize=function(l){return l.set(te,j)},this.setSize=function(l,b,O=!0){if(k.isPresenting){tt("WebGLRenderer: Can't change size while VR device is presenting.");return}te=l,j=b,t.width=Math.floor(l*de),t.height=Math.floor(b*de),O===!0&&(t.style.width=l+"px",t.style.height=b+"px"),d!==null&&d.setSize(t.width,t.height),this.setViewport(0,0,l,b)},this.getDrawingBufferSize=function(l){return l.set(te*de,j*de).floor()},this.setDrawingBufferSize=function(l,b,O){te=l,j=b,de=O,t.width=Math.floor(l*O),t.height=Math.floor(b*O),this.setViewport(0,0,l,b)},this.setEffects=function(l){if(I===Ct){console.error("THREE.WebGLRenderer: setEffects() requires outputBufferType set to HalfFloatType or FloatType.");return}if(l){for(let b=0;b<l.length;b++)if(l[b].isOutputPass===!0){console.warn("THREE.WebGLRenderer: OutputPass is not needed in setEffects(). Tone mapping and color space conversion are applied automatically.");break}}d.setEffects(l||[])},this.getCurrentViewport=function(l){return l.copy(N)},this.getViewport=function(l){return l.copy(B)},this.setViewport=function(l,b,O,w){l.isVector4?B.set(l.x,l.y,l.z,l.w):B.set(l,b,O,w),Te.viewport(N.copy(B).multiplyScalar(de).round())},this.getScissor=function(l){return l.copy(q)},this.setScissor=function(l,b,O,w){l.isVector4?q.set(l.x,l.y,l.z,l.w):q.set(l,b,O,w),Te.scissor(F.copy(q).multiplyScalar(de).round())},this.getScissorTest=function(){return Q},this.setScissorTest=function(l){Te.setScissorTest(Q=l)},this.setOpaqueSort=function(l){Ce=l},this.setTransparentSort=function(l){me=l},this.getClearColor=function(l){return l.copy(Ee.getClearColor())},this.setClearColor=function(){Ee.setClearColor(...arguments)},this.getClearAlpha=function(){return Ee.getClearAlpha()},this.setClearAlpha=function(){Ee.setClearAlpha(...arguments)},this.clear=function(l=!0,b=!0,O=!0){let w=0;if(l){let L=!1;if(V!==null){const ce=V.texture.format;L=c.has(ce)}if(L){const ce=V.texture.type,pe=s.has(ce),fe=Ee.getClearColor(),xe=Ee.getClearAlpha(),Re=fe.r,Ne=fe.g,Ge=fe.b;pe?(_[0]=Re,_[1]=Ne,_[2]=Ge,_[3]=xe,g.clearBufferuiv(g.COLOR,0,_)):(T[0]=Re,T[1]=Ne,T[2]=Ge,T[3]=xe,g.clearBufferiv(g.COLOR,0,T))}else w|=g.COLOR_BUFFER_BIT}b&&(w|=g.DEPTH_BUFFER_BIT),O&&(w|=g.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),w!==0&&g.clear(w)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.dispose=function(){t.removeEventListener("webglcontextlost",Se,!1),t.removeEventListener("webglcontextrestored",ye,!1),t.removeEventListener("webglcontextcreationerror",nt,!1),Ee.dispose(),we.dispose(),J.dispose(),a.dispose(),X.dispose(),ge.dispose(),ie.dispose(),he.dispose(),re.dispose(),k.dispose(),k.removeEventListener("sessionstart",ui),k.removeEventListener("sessionend",pi),Ht.stop()};function Se(l){l.preventDefault(),Ei("WebGLRenderer: Context Lost."),$=!0}function ye(){Ei("WebGLRenderer: Context Restored."),$=!1;const l=u.autoReset,b=ve.enabled,O=ve.autoUpdate,w=ve.needsUpdate,L=ve.type;ee(),u.autoReset=l,ve.enabled=b,ve.autoUpdate=O,ve.needsUpdate=w,ve.type=L}function nt(l){rt("WebGLRenderer: A WebGL context could not be created. Reason: ",l.statusMessage)}function qe(l){const b=l.target;b.removeEventListener("dispose",qe),Lt(b)}function Lt(l){wt(l),a.remove(l)}function wt(l){const b=a.get(l).programs;b!==void 0&&(b.forEach(function(O){re.releaseProgram(O)}),l.isShaderMaterial&&re.releaseShaderCache(l))}this.renderBufferDirect=function(l,b,O,w,L,ce){b===null&&(b=He);const pe=L.isMesh&&L.matrixWorld.determinant()<0,fe=gr(l,b,O,w,L);Te.setMaterial(w,pe);let xe=O.index,Re=1;if(w.wireframe===!0){if(xe=W.getWireframeAttribute(O),xe===void 0)return;Re=2}const Ne=O.drawRange,Ge=O.attributes.position;let be=Ne.start*Re,je=(Ne.start+Ne.count)*Re;ce!==null&&(be=Math.max(be,ce.start*Re),je=Math.min(je,(ce.start+ce.count)*Re)),xe!==null?(be=Math.max(be,0),je=Math.min(je,xe.count)):Ge!=null&&(be=Math.max(be,0),je=Math.min(je,Ge.count));const st=je-be;if(st<0||st===1/0)return;ie.setup(L,w,fe,O,xe);let ot,Qe=Be;if(xe!==null&&(ot=Z.get(xe),Qe=E,Qe.setIndex(ot)),L.isMesh)w.wireframe===!0?(Te.setLineWidth(w.wireframeLinewidth*$e()),Qe.setMode(g.LINES)):Qe.setMode(g.TRIANGLES);else if(L.isLine){let ht=w.linewidth;ht===void 0&&(ht=1),Te.setLineWidth(ht*$e()),L.isLineSegments?Qe.setMode(g.LINES):L.isLineLoop?Qe.setMode(g.LINE_LOOP):Qe.setMode(g.LINE_STRIP)}else L.isPoints?Qe.setMode(g.POINTS):L.isSprite&&Qe.setMode(g.TRIANGLES);if(L.isBatchedMesh)if(L._multiDrawInstances!==null)Ga("WebGLRenderer: renderMultiDrawInstances has been deprecated and will be removed in r184. Append to renderMultiDraw arguments and use indirection."),Qe.renderMultiDrawInstances(L._multiDrawStarts,L._multiDrawCounts,L._multiDrawCount,L._multiDrawInstances);else if(Ve.get("WEBGL_multi_draw"))Qe.renderMultiDraw(L._multiDrawStarts,L._multiDrawCounts,L._multiDrawCount);else{const ht=L._multiDrawStarts,Ae=L._multiDrawCounts,St=L._multiDrawCount,We=xe?Z.get(xe).bytesPerElement:1,Tt=a.get(w).currentProgram.getUniforms();for(let At=0;At<St;At++)Tt.setValue(g,"_gl_DrawID",At),Qe.render(ht[At]/We,Ae[At])}else if(L.isInstancedMesh)Qe.renderInstances(be,st,L.count);else if(O.isInstancedBufferGeometry){const ht=O._maxInstanceCount!==void 0?O._maxInstanceCount:1/0,Ae=Math.min(O.instanceCount,ht);Qe.renderInstances(be,st,Ae)}else Qe.render(be,st)};function di(l,b,O){l.transparent===!0&&l.side===Et&&l.forceSinglePass===!1?(l.side=Mt,l.needsUpdate=!0,vn(l,b,O),l.side=pn,l.needsUpdate=!0,vn(l,b,O),l.side=Et):vn(l,b,O)}this.compile=function(l,b,O=null){O===null&&(O=l),y=J.get(O),y.init(b),U.push(y),O.traverseVisible(function(L){L.isLight&&L.layers.test(b.layers)&&(y.pushLight(L),L.castShadow&&y.pushShadow(L))}),l!==O&&l.traverseVisible(function(L){L.isLight&&L.layers.test(b.layers)&&(y.pushLight(L),L.castShadow&&y.pushShadow(L))}),y.setupLights();const w=new Set;return l.traverse(function(L){if(!(L.isMesh||L.isPoints||L.isLine||L.isSprite))return;const ce=L.material;if(ce)if(Array.isArray(ce))for(let pe=0;pe<ce.length;pe++){const fe=ce[pe];di(fe,O,L),w.add(fe)}else di(ce,O,L),w.add(ce)}),y=U.pop(),w},this.compileAsync=function(l,b,O=null){const w=this.compile(l,b,O);return new Promise(L=>{function ce(){if(w.forEach(function(pe){a.get(pe).currentProgram.isReady()&&w.delete(pe)}),w.size===0){L(l);return}setTimeout(ce,10)}Ve.get("KHR_parallel_shader_compile")!==null?ce():setTimeout(ce,10)})};let Fn=null;function _r(l){Fn&&Fn(l)}function ui(){Ht.stop()}function pi(){Ht.start()}const Ht=new cr;Ht.setAnimationLoop(_r),typeof self<"u"&&Ht.setContext(self),this.setAnimationLoop=function(l){Fn=l,k.setAnimationLoop(l),l===null?Ht.stop():Ht.start()},k.addEventListener("sessionstart",ui),k.addEventListener("sessionend",pi),this.render=function(l,b){if(b!==void 0&&b.isCamera!==!0){rt("WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if($===!0)return;const O=k.enabled===!0&&k.isPresenting===!0,w=d!==null&&(V===null||O)&&d.begin(p,V);if(l.matrixWorldAutoUpdate===!0&&l.updateMatrixWorld(),b.parent===null&&b.matrixWorldAutoUpdate===!0&&b.updateMatrixWorld(),k.enabled===!0&&k.isPresenting===!0&&(d===null||d.isCompositing()===!1)&&(k.cameraAutoUpdate===!0&&k.updateCamera(b),b=k.getCamera()),l.isScene===!0&&l.onBeforeRender(p,l,b,V),y=J.get(l,U.length),y.init(b),U.push(y),ke.multiplyMatrices(b.projectionMatrix,b.matrixWorldInverse),De.setFromProjectionMatrix(ke,xi,b.reversedDepth),Me=this.localClippingEnabled,_e=ne.init(this.clippingPlanes,Me),v=we.get(l,C.length),v.init(),C.push(v),k.enabled===!0&&k.isPresenting===!0){const pe=p.xr.getDepthSensingMesh();pe!==null&&On(pe,b,-1/0,p.sortObjects)}On(l,b,0,p.sortObjects),v.finish(),p.sortObjects===!0&&v.sort(Ce,me),Ie=k.enabled===!1||k.isPresenting===!1||k.hasDepthSensing()===!1,Ie&&Ee.addToRenderList(v,l),this.info.render.frame++,_e===!0&&ne.beginShadows();const L=y.state.shadowsArray;if(ve.render(L,l,b),_e===!0&&ne.endShadows(),this.info.autoReset===!0&&this.info.reset(),(w&&d.hasRenderPass())===!1){const pe=v.opaque,fe=v.transmissive;if(y.setupLights(),b.isArrayCamera){const xe=b.cameras;if(fe.length>0)for(let Re=0,Ne=xe.length;Re<Ne;Re++){const Ge=xe[Re];mi(pe,fe,l,Ge)}Ie&&Ee.render(l);for(let Re=0,Ne=xe.length;Re<Ne;Re++){const Ge=xe[Re];hi(v,l,Ge,Ge.viewport)}}else fe.length>0&&mi(pe,fe,l,b),Ie&&Ee.render(l),hi(v,l,b)}V!==null&&H===0&&(M.updateMultisampleRenderTarget(V),M.updateRenderTargetMipmap(V)),w&&d.end(p),l.isScene===!0&&l.onAfterRender(p,l,b),ie.resetDefaultState(),z=-1,K=null,U.pop(),U.length>0?(y=U[U.length-1],_e===!0&&ne.setGlobalState(p.clippingPlanes,y.state.camera)):y=null,C.pop(),C.length>0?v=C[C.length-1]:v=null};function On(l,b,O,w){if(l.visible===!1)return;if(l.layers.test(b.layers)){if(l.isGroup)O=l.renderOrder;else if(l.isLOD)l.autoUpdate===!0&&l.update(b);else if(l.isLight)y.pushLight(l),l.castShadow&&y.pushShadow(l);else if(l.isSprite){if(!l.frustumCulled||De.intersectsSprite(l)){w&&Fe.setFromMatrixPosition(l.matrixWorld).applyMatrix4(ke);const pe=ge.update(l),fe=l.material;fe.visible&&v.push(l,pe,fe,O,Fe.z,null)}}else if((l.isMesh||l.isLine||l.isPoints)&&(!l.frustumCulled||De.intersectsObject(l))){const pe=ge.update(l),fe=l.material;if(w&&(l.boundingSphere!==void 0?(l.boundingSphere===null&&l.computeBoundingSphere(),Fe.copy(l.boundingSphere.center)):(pe.boundingSphere===null&&pe.computeBoundingSphere(),Fe.copy(pe.boundingSphere.center)),Fe.applyMatrix4(l.matrixWorld).applyMatrix4(ke)),Array.isArray(fe)){const xe=pe.groups;for(let Re=0,Ne=xe.length;Re<Ne;Re++){const Ge=xe[Re],be=fe[Ge.materialIndex];be&&be.visible&&v.push(l,pe,be,O,Fe.z,Ge)}}else fe.visible&&v.push(l,pe,fe,O,Fe.z,null)}}const ce=l.children;for(let pe=0,fe=ce.length;pe<fe;pe++)On(ce[pe],b,O,w)}function hi(l,b,O,w){const{opaque:L,transmissive:ce,transparent:pe}=l;y.setupLightsView(O),_e===!0&&ne.setGlobalState(p.clippingPlanes,O),w&&Te.viewport(N.copy(w)),L.length>0&&gn(L,b,O),ce.length>0&&gn(ce,b,O),pe.length>0&&gn(pe,b,O),Te.buffers.depth.setTest(!0),Te.buffers.depth.setMask(!0),Te.buffers.color.setMask(!0),Te.setPolygonOffset(!1)}function mi(l,b,O,w){if((O.isScene===!0?O.overrideMaterial:null)!==null)return;if(y.state.transmissionRenderTarget[w.id]===void 0){const be=Ve.has("EXT_color_buffer_half_float")||Ve.has("EXT_color_buffer_float");y.state.transmissionRenderTarget[w.id]=new Dt(1,1,{generateMipmaps:!0,type:be?Gt:Ct,minFilter:jt,samples:Math.max(4,Ye.samples),stencilBuffer:r,resolveDepthBuffer:!1,resolveStencilBuffer:!1,colorSpace:lt.workingColorSpace})}const ce=y.state.transmissionRenderTarget[w.id],pe=w.viewport||N;ce.setSize(pe.z*p.transmissionResolutionScale,pe.w*p.transmissionResolutionScale);const fe=p.getRenderTarget(),xe=p.getActiveCubeFace(),Re=p.getActiveMipmapLevel();p.setRenderTarget(ce),p.getClearColor(Y),ae=p.getClearAlpha(),ae<1&&p.setClearColor(16777215,.5),p.clear(),Ie&&Ee.render(O);const Ne=p.toneMapping;p.toneMapping=Pt;const Ge=w.viewport;if(w.viewport!==void 0&&(w.viewport=void 0),y.setupLightsView(w),_e===!0&&ne.setGlobalState(p.clippingPlanes,w),gn(l,O,w),M.updateMultisampleRenderTarget(ce),M.updateRenderTargetMipmap(ce),Ve.has("WEBGL_multisampled_render_to_texture")===!1){let be=!1;for(let je=0,st=b.length;je<st;je++){const ot=b[je],{object:Qe,geometry:ht,material:Ae,group:St}=ot;if(Ae.side===Et&&Qe.layers.test(w.layers)){const We=Ae.side;Ae.side=Mt,Ae.needsUpdate=!0,_i(Qe,O,w,ht,Ae,St),Ae.side=We,Ae.needsUpdate=!0,be=!0}}be===!0&&(M.updateMultisampleRenderTarget(ce),M.updateRenderTargetMipmap(ce))}p.setRenderTarget(fe,xe,Re),p.setClearColor(Y,ae),Ge!==void 0&&(w.viewport=Ge),p.toneMapping=Ne}function gn(l,b,O){const w=b.isScene===!0?b.overrideMaterial:null;for(let L=0,ce=l.length;L<ce;L++){const pe=l[L],{object:fe,geometry:xe,group:Re}=pe;let Ne=pe.material;Ne.allowOverride===!0&&w!==null&&(Ne=w),fe.layers.test(O.layers)&&_i(fe,b,O,xe,Ne,Re)}}function _i(l,b,O,w,L,ce){l.onBeforeRender(p,b,O,w,L,ce),l.modelViewMatrix.multiplyMatrices(O.matrixWorldInverse,l.matrixWorld),l.normalMatrix.getNormalMatrix(l.modelViewMatrix),L.onBeforeRender(p,b,O,w,l,ce),L.transparent===!0&&L.side===Et&&L.forceSinglePass===!1?(L.side=Mt,L.needsUpdate=!0,p.renderBufferDirect(O,b,w,L,l,ce),L.side=pn,L.needsUpdate=!0,p.renderBufferDirect(O,b,w,L,l,ce),L.side=Et):p.renderBufferDirect(O,b,w,L,l,ce),l.onAfterRender(p,b,O,w,L,ce)}function vn(l,b,O){b.isScene!==!0&&(b=He);const w=a.get(l),L=y.state.lights,ce=y.state.shadowsArray,pe=L.state.version,fe=re.getParameters(l,L.state,ce,b,O),xe=re.getProgramCacheKey(fe);let Re=w.programs;w.environment=l.isMeshStandardMaterial||l.isMeshLambertMaterial||l.isMeshPhongMaterial?b.environment:null,w.fog=b.fog;const Ne=l.isMeshStandardMaterial||l.isMeshLambertMaterial&&!l.envMap||l.isMeshPhongMaterial&&!l.envMap;w.envMap=X.get(l.envMap||w.environment,Ne),w.envMapRotation=w.environment!==null&&l.envMap===null?b.environmentRotation:l.envMapRotation,Re===void 0&&(l.addEventListener("dispose",qe),Re=new Map,w.programs=Re);let Ge=Re.get(xe);if(Ge!==void 0){if(w.currentProgram===Ge&&w.lightsStateVersion===pe)return vi(l,fe),Ge}else fe.uniforms=re.getUniforms(l),l.onBeforeCompile(fe,p),Ge=re.acquireProgram(fe,xe),Re.set(xe,Ge),w.uniforms=fe.uniforms;const be=w.uniforms;return(!l.isShaderMaterial&&!l.isRawShaderMaterial||l.clipping===!0)&&(be.clippingPlanes=ne.uniform),vi(l,fe),w.needsLights=Sr(l),w.lightsStateVersion=pe,w.needsLights&&(be.ambientLightColor.value=L.state.ambient,be.lightProbe.value=L.state.probe,be.directionalLights.value=L.state.directional,be.directionalLightShadows.value=L.state.directionalShadow,be.spotLights.value=L.state.spot,be.spotLightShadows.value=L.state.spotShadow,be.rectAreaLights.value=L.state.rectArea,be.ltc_1.value=L.state.rectAreaLTC1,be.ltc_2.value=L.state.rectAreaLTC2,be.pointLights.value=L.state.point,be.pointLightShadows.value=L.state.pointShadow,be.hemisphereLights.value=L.state.hemi,be.directionalShadowMatrix.value=L.state.directionalShadowMatrix,be.spotLightMatrix.value=L.state.spotLightMatrix,be.spotLightMap.value=L.state.spotLightMap,be.pointShadowMatrix.value=L.state.pointShadowMatrix),w.currentProgram=Ge,w.uniformsList=null,Ge}function gi(l){if(l.uniformsList===null){const b=l.currentProgram.getUniforms();l.uniformsList=Pn.seqWithValue(b.seq,l.uniforms)}return l.uniformsList}function vi(l,b){const O=a.get(l);O.outputColorSpace=b.outputColorSpace,O.batching=b.batching,O.batchingColor=b.batchingColor,O.instancing=b.instancing,O.instancingColor=b.instancingColor,O.instancingMorph=b.instancingMorph,O.skinning=b.skinning,O.morphTargets=b.morphTargets,O.morphNormals=b.morphNormals,O.morphColors=b.morphColors,O.morphTargetsCount=b.morphTargetsCount,O.numClippingPlanes=b.numClippingPlanes,O.numIntersection=b.numClipIntersection,O.vertexAlphas=b.vertexAlphas,O.vertexTangents=b.vertexTangents,O.toneMapping=b.toneMapping}function gr(l,b,O,w,L){b.isScene!==!0&&(b=He),M.resetTextureUnits();const ce=b.fog,pe=w.isMeshStandardMaterial||w.isMeshLambertMaterial||w.isMeshPhongMaterial?b.environment:null,fe=V===null?p.outputColorSpace:V.isXRRenderTarget===!0?V.texture.colorSpace:Un,xe=w.isMeshStandardMaterial||w.isMeshLambertMaterial&&!w.envMap||w.isMeshPhongMaterial&&!w.envMap,Re=X.get(w.envMap||pe,xe),Ne=w.vertexColors===!0&&!!O.attributes.color&&O.attributes.color.itemSize===4,Ge=!!O.attributes.tangent&&(!!w.normalMap||w.anisotropy>0),be=!!O.morphAttributes.position,je=!!O.morphAttributes.normal,st=!!O.morphAttributes.color;let ot=Pt;w.toneMapped&&(V===null||V.isXRRenderTarget===!0)&&(ot=p.toneMapping);const Qe=O.morphAttributes.position||O.morphAttributes.normal||O.morphAttributes.color,ht=Qe!==void 0?Qe.length:0,Ae=a.get(w),St=y.state.lights;if(_e===!0&&(Me===!0||l!==K)){const ut=l===K&&w.id===z;ne.setState(w,l,ut)}let We=!1;w.version===Ae.__version?(Ae.needsLights&&Ae.lightsStateVersion!==St.state.version||Ae.outputColorSpace!==fe||L.isBatchedMesh&&Ae.batching===!1||!L.isBatchedMesh&&Ae.batching===!0||L.isBatchedMesh&&Ae.batchingColor===!0&&L.colorTexture===null||L.isBatchedMesh&&Ae.batchingColor===!1&&L.colorTexture!==null||L.isInstancedMesh&&Ae.instancing===!1||!L.isInstancedMesh&&Ae.instancing===!0||L.isSkinnedMesh&&Ae.skinning===!1||!L.isSkinnedMesh&&Ae.skinning===!0||L.isInstancedMesh&&Ae.instancingColor===!0&&L.instanceColor===null||L.isInstancedMesh&&Ae.instancingColor===!1&&L.instanceColor!==null||L.isInstancedMesh&&Ae.instancingMorph===!0&&L.morphTexture===null||L.isInstancedMesh&&Ae.instancingMorph===!1&&L.morphTexture!==null||Ae.envMap!==Re||w.fog===!0&&Ae.fog!==ce||Ae.numClippingPlanes!==void 0&&(Ae.numClippingPlanes!==ne.numPlanes||Ae.numIntersection!==ne.numIntersection)||Ae.vertexAlphas!==Ne||Ae.vertexTangents!==Ge||Ae.morphTargets!==be||Ae.morphNormals!==je||Ae.morphColors!==st||Ae.toneMapping!==ot||Ae.morphTargetsCount!==ht)&&(We=!0):(We=!0,Ae.__version=w.version);let Tt=Ae.currentProgram;We===!0&&(Tt=vn(w,b,L));let At=!1,Vt=!1,Kt=!1;const et=Tt.getUniforms(),pt=Ae.uniforms;if(Te.useProgram(Tt.program)&&(At=!0,Vt=!0,Kt=!0),w.id!==z&&(z=w.id,Vt=!0),At||K!==l){Te.buffers.depth.getReversed()&&l.reversedDepth!==!0&&(l._reversedDepth=!0,l.updateProjectionMatrix()),et.setValue(g,"projectionMatrix",l.projectionMatrix),et.setValue(g,"viewMatrix",l.matrixWorldInverse);const Ft=et.map.cameraPosition;Ft!==void 0&&Ft.setValue(g,Le.setFromMatrixPosition(l.matrixWorld)),Ye.logarithmicDepthBuffer&&et.setValue(g,"logDepthBufFC",2/(Math.log(l.far+1)/Math.LN2)),(w.isMeshPhongMaterial||w.isMeshToonMaterial||w.isMeshLambertMaterial||w.isMeshBasicMaterial||w.isMeshStandardMaterial||w.isShaderMaterial)&&et.setValue(g,"isOrthographic",l.isOrthographicCamera===!0),K!==l&&(K=l,Vt=!0,Kt=!0)}if(Ae.needsLights&&(St.state.directionalShadowMap.length>0&&et.setValue(g,"directionalShadowMap",St.state.directionalShadowMap,M),St.state.spotShadowMap.length>0&&et.setValue(g,"spotShadowMap",St.state.spotShadowMap,M),St.state.pointShadowMap.length>0&&et.setValue(g,"pointShadowMap",St.state.pointShadowMap,M)),L.isSkinnedMesh){et.setOptional(g,L,"bindMatrix"),et.setOptional(g,L,"bindMatrixInverse");const ut=L.skeleton;ut&&(ut.boneTexture===null&&ut.computeBoneTexture(),et.setValue(g,"boneTexture",ut.boneTexture,M))}L.isBatchedMesh&&(et.setOptional(g,L,"batchingTexture"),et.setValue(g,"batchingTexture",L._matricesTexture,M),et.setOptional(g,L,"batchingIdTexture"),et.setValue(g,"batchingIdTexture",L._indirectTexture,M),et.setOptional(g,L,"batchingColorTexture"),L._colorsTexture!==null&&et.setValue(g,"batchingColorTexture",L._colorsTexture,M));const Nt=O.morphAttributes;if((Nt.position!==void 0||Nt.normal!==void 0||Nt.color!==void 0)&&ue.update(L,O,Tt),(Vt||Ae.receiveShadow!==L.receiveShadow)&&(Ae.receiveShadow=L.receiveShadow,et.setValue(g,"receiveShadow",L.receiveShadow)),(w.isMeshStandardMaterial||w.isMeshLambertMaterial||w.isMeshPhongMaterial)&&w.envMap===null&&b.environment!==null&&(pt.envMapIntensity.value=b.environmentIntensity),pt.dfgLUT!==void 0&&(pt.dfgLUT.value=Yd()),Vt&&(et.setValue(g,"toneMappingExposure",p.toneMappingExposure),Ae.needsLights&&vr(pt,Kt),ce&&w.fog===!0&&Pe.refreshFogUniforms(pt,ce),Pe.refreshMaterialUniforms(pt,w,de,j,y.state.transmissionRenderTarget[l.id]),Pn.upload(g,gi(Ae),pt,M)),w.isShaderMaterial&&w.uniformsNeedUpdate===!0&&(Pn.upload(g,gi(Ae),pt,M),w.uniformsNeedUpdate=!1),w.isSpriteMaterial&&et.setValue(g,"center",L.center),et.setValue(g,"modelViewMatrix",L.modelViewMatrix),et.setValue(g,"normalMatrix",L.normalMatrix),et.setValue(g,"modelMatrix",L.matrixWorld),w.isShaderMaterial||w.isRawShaderMaterial){const ut=w.uniformsGroups;for(let Ft=0,qt=ut.length;Ft<qt;Ft++){const Si=ut[Ft];he.update(Si,Tt),he.bind(Si,Tt)}}return Tt}function vr(l,b){l.ambientLightColor.needsUpdate=b,l.lightProbe.needsUpdate=b,l.directionalLights.needsUpdate=b,l.directionalLightShadows.needsUpdate=b,l.pointLights.needsUpdate=b,l.pointLightShadows.needsUpdate=b,l.spotLights.needsUpdate=b,l.spotLightShadows.needsUpdate=b,l.rectAreaLights.needsUpdate=b,l.hemisphereLights.needsUpdate=b}function Sr(l){return l.isMeshLambertMaterial||l.isMeshToonMaterial||l.isMeshPhongMaterial||l.isMeshStandardMaterial||l.isShadowMaterial||l.isShaderMaterial&&l.lights===!0}this.getActiveCubeFace=function(){return R},this.getActiveMipmapLevel=function(){return H},this.getRenderTarget=function(){return V},this.setRenderTargetTextures=function(l,b,O){const w=a.get(l);w.__autoAllocateDepthBuffer=l.resolveDepthBuffer===!1,w.__autoAllocateDepthBuffer===!1&&(w.__useRenderToTexture=!1),a.get(l.texture).__webglTexture=b,a.get(l.depthTexture).__webglTexture=w.__autoAllocateDepthBuffer?void 0:O,w.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(l,b){const O=a.get(l);O.__webglFramebuffer=b,O.__useDefaultFramebuffer=b===void 0};const Er=g.createFramebuffer();this.setRenderTarget=function(l,b=0,O=0){V=l,R=b,H=O;let w=null,L=!1,ce=!1;if(l){const fe=a.get(l);if(fe.__useDefaultFramebuffer!==void 0){Te.bindFramebuffer(g.FRAMEBUFFER,fe.__webglFramebuffer),N.copy(l.viewport),F.copy(l.scissor),se=l.scissorTest,Te.viewport(N),Te.scissor(F),Te.setScissorTest(se),z=-1;return}else if(fe.__webglFramebuffer===void 0)M.setupRenderTarget(l);else if(fe.__hasExternalTextures)M.rebindTextures(l,a.get(l.texture).__webglTexture,a.get(l.depthTexture).__webglTexture);else if(l.depthBuffer){const Ne=l.depthTexture;if(fe.__boundDepthTexture!==Ne){if(Ne!==null&&a.has(Ne)&&(l.width!==Ne.image.width||l.height!==Ne.image.height))throw new Error("WebGLRenderTarget: Attached DepthTexture is initialized to the incorrect size.");M.setupDepthRenderbuffer(l)}}const xe=l.texture;(xe.isData3DTexture||xe.isDataArrayTexture||xe.isCompressedArrayTexture)&&(ce=!0);const Re=a.get(l).__webglFramebuffer;l.isWebGLCubeRenderTarget?(Array.isArray(Re[b])?w=Re[b][O]:w=Re[b],L=!0):l.samples>0&&M.useMultisampledRTT(l)===!1?w=a.get(l).__webglMultisampledFramebuffer:Array.isArray(Re)?w=Re[O]:w=Re,N.copy(l.viewport),F.copy(l.scissor),se=l.scissorTest}else N.copy(B).multiplyScalar(de).floor(),F.copy(q).multiplyScalar(de).floor(),se=Q;if(O!==0&&(w=Er),Te.bindFramebuffer(g.FRAMEBUFFER,w)&&Te.drawBuffers(l,w),Te.viewport(N),Te.scissor(F),Te.setScissorTest(se),L){const fe=a.get(l.texture);g.framebufferTexture2D(g.FRAMEBUFFER,g.COLOR_ATTACHMENT0,g.TEXTURE_CUBE_MAP_POSITIVE_X+b,fe.__webglTexture,O)}else if(ce){const fe=b;for(let xe=0;xe<l.textures.length;xe++){const Re=a.get(l.textures[xe]);g.framebufferTextureLayer(g.FRAMEBUFFER,g.COLOR_ATTACHMENT0+xe,Re.__webglTexture,O,fe)}}else if(l!==null&&O!==0){const fe=a.get(l.texture);g.framebufferTexture2D(g.FRAMEBUFFER,g.COLOR_ATTACHMENT0,g.TEXTURE_2D,fe.__webglTexture,O)}z=-1},this.readRenderTargetPixels=function(l,b,O,w,L,ce,pe,fe=0){if(!(l&&l.isWebGLRenderTarget)){rt("WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let xe=a.get(l).__webglFramebuffer;if(l.isWebGLCubeRenderTarget&&pe!==void 0&&(xe=xe[pe]),xe){Te.bindFramebuffer(g.FRAMEBUFFER,xe);try{const Re=l.textures[fe],Ne=Re.format,Ge=Re.type;if(l.textures.length>1&&g.readBuffer(g.COLOR_ATTACHMENT0+fe),!Ye.textureFormatReadable(Ne)){rt("WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(!Ye.textureTypeReadable(Ge)){rt("WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}b>=0&&b<=l.width-w&&O>=0&&O<=l.height-L&&g.readPixels(b,O,w,L,oe.convert(Ne),oe.convert(Ge),ce)}finally{const Re=V!==null?a.get(V).__webglFramebuffer:null;Te.bindFramebuffer(g.FRAMEBUFFER,Re)}}},this.readRenderTargetPixelsAsync=async function(l,b,O,w,L,ce,pe,fe=0){if(!(l&&l.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let xe=a.get(l).__webglFramebuffer;if(l.isWebGLCubeRenderTarget&&pe!==void 0&&(xe=xe[pe]),xe)if(b>=0&&b<=l.width-w&&O>=0&&O<=l.height-L){Te.bindFramebuffer(g.FRAMEBUFFER,xe);const Re=l.textures[fe],Ne=Re.format,Ge=Re.type;if(l.textures.length>1&&g.readBuffer(g.COLOR_ATTACHMENT0+fe),!Ye.textureFormatReadable(Ne))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(!Ye.textureTypeReadable(Ge))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");const be=g.createBuffer();g.bindBuffer(g.PIXEL_PACK_BUFFER,be),g.bufferData(g.PIXEL_PACK_BUFFER,ce.byteLength,g.STREAM_READ),g.readPixels(b,O,w,L,oe.convert(Ne),oe.convert(Ge),0);const je=V!==null?a.get(V).__webglFramebuffer:null;Te.bindFramebuffer(g.FRAMEBUFFER,je);const st=g.fenceSync(g.SYNC_GPU_COMMANDS_COMPLETE,0);return g.flush(),await br(g,st,4),g.bindBuffer(g.PIXEL_PACK_BUFFER,be),g.getBufferSubData(g.PIXEL_PACK_BUFFER,0,ce),g.deleteBuffer(be),g.deleteSync(st),ce}else throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")},this.copyFramebufferToTexture=function(l,b=null,O=0){const w=Math.pow(2,-O),L=Math.floor(l.image.width*w),ce=Math.floor(l.image.height*w),pe=b!==null?b.x:0,fe=b!==null?b.y:0;M.setTexture2D(l,0),g.copyTexSubImage2D(g.TEXTURE_2D,O,0,0,pe,fe,L,ce),Te.unbindTexture()};const xr=g.createFramebuffer(),Mr=g.createFramebuffer();this.copyTextureToTexture=function(l,b,O=null,w=null,L=0,ce=0){let pe,fe,xe,Re,Ne,Ge,be,je,st;const ot=l.isCompressedTexture?l.mipmaps[ce]:l.image;if(O!==null)pe=O.max.x-O.min.x,fe=O.max.y-O.min.y,xe=O.isBox3?O.max.z-O.min.z:1,Re=O.min.x,Ne=O.min.y,Ge=O.isBox3?O.min.z:0;else{const pt=Math.pow(2,-L);pe=Math.floor(ot.width*pt),fe=Math.floor(ot.height*pt),l.isDataArrayTexture?xe=ot.depth:l.isData3DTexture?xe=Math.floor(ot.depth*pt):xe=1,Re=0,Ne=0,Ge=0}w!==null?(be=w.x,je=w.y,st=w.z):(be=0,je=0,st=0);const Qe=oe.convert(b.format),ht=oe.convert(b.type);let Ae;b.isData3DTexture?(M.setTexture3D(b,0),Ae=g.TEXTURE_3D):b.isDataArrayTexture||b.isCompressedArrayTexture?(M.setTexture2DArray(b,0),Ae=g.TEXTURE_2D_ARRAY):(M.setTexture2D(b,0),Ae=g.TEXTURE_2D),g.pixelStorei(g.UNPACK_FLIP_Y_WEBGL,b.flipY),g.pixelStorei(g.UNPACK_PREMULTIPLY_ALPHA_WEBGL,b.premultiplyAlpha),g.pixelStorei(g.UNPACK_ALIGNMENT,b.unpackAlignment);const St=g.getParameter(g.UNPACK_ROW_LENGTH),We=g.getParameter(g.UNPACK_IMAGE_HEIGHT),Tt=g.getParameter(g.UNPACK_SKIP_PIXELS),At=g.getParameter(g.UNPACK_SKIP_ROWS),Vt=g.getParameter(g.UNPACK_SKIP_IMAGES);g.pixelStorei(g.UNPACK_ROW_LENGTH,ot.width),g.pixelStorei(g.UNPACK_IMAGE_HEIGHT,ot.height),g.pixelStorei(g.UNPACK_SKIP_PIXELS,Re),g.pixelStorei(g.UNPACK_SKIP_ROWS,Ne),g.pixelStorei(g.UNPACK_SKIP_IMAGES,Ge);const Kt=l.isDataArrayTexture||l.isData3DTexture,et=b.isDataArrayTexture||b.isData3DTexture;if(l.isDepthTexture){const pt=a.get(l),Nt=a.get(b),ut=a.get(pt.__renderTarget),Ft=a.get(Nt.__renderTarget);Te.bindFramebuffer(g.READ_FRAMEBUFFER,ut.__webglFramebuffer),Te.bindFramebuffer(g.DRAW_FRAMEBUFFER,Ft.__webglFramebuffer);for(let qt=0;qt<xe;qt++)Kt&&(g.framebufferTextureLayer(g.READ_FRAMEBUFFER,g.COLOR_ATTACHMENT0,a.get(l).__webglTexture,L,Ge+qt),g.framebufferTextureLayer(g.DRAW_FRAMEBUFFER,g.COLOR_ATTACHMENT0,a.get(b).__webglTexture,ce,st+qt)),g.blitFramebuffer(Re,Ne,pe,fe,be,je,pe,fe,g.DEPTH_BUFFER_BIT,g.NEAREST);Te.bindFramebuffer(g.READ_FRAMEBUFFER,null),Te.bindFramebuffer(g.DRAW_FRAMEBUFFER,null)}else if(L!==0||l.isRenderTargetTexture||a.has(l)){const pt=a.get(l),Nt=a.get(b);Te.bindFramebuffer(g.READ_FRAMEBUFFER,xr),Te.bindFramebuffer(g.DRAW_FRAMEBUFFER,Mr);for(let ut=0;ut<xe;ut++)Kt?g.framebufferTextureLayer(g.READ_FRAMEBUFFER,g.COLOR_ATTACHMENT0,pt.__webglTexture,L,Ge+ut):g.framebufferTexture2D(g.READ_FRAMEBUFFER,g.COLOR_ATTACHMENT0,g.TEXTURE_2D,pt.__webglTexture,L),et?g.framebufferTextureLayer(g.DRAW_FRAMEBUFFER,g.COLOR_ATTACHMENT0,Nt.__webglTexture,ce,st+ut):g.framebufferTexture2D(g.DRAW_FRAMEBUFFER,g.COLOR_ATTACHMENT0,g.TEXTURE_2D,Nt.__webglTexture,ce),L!==0?g.blitFramebuffer(Re,Ne,pe,fe,be,je,pe,fe,g.COLOR_BUFFER_BIT,g.NEAREST):et?g.copyTexSubImage3D(Ae,ce,be,je,st+ut,Re,Ne,pe,fe):g.copyTexSubImage2D(Ae,ce,be,je,Re,Ne,pe,fe);Te.bindFramebuffer(g.READ_FRAMEBUFFER,null),Te.bindFramebuffer(g.DRAW_FRAMEBUFFER,null)}else et?l.isDataTexture||l.isData3DTexture?g.texSubImage3D(Ae,ce,be,je,st,pe,fe,xe,Qe,ht,ot.data):b.isCompressedArrayTexture?g.compressedTexSubImage3D(Ae,ce,be,je,st,pe,fe,xe,Qe,ot.data):g.texSubImage3D(Ae,ce,be,je,st,pe,fe,xe,Qe,ht,ot):l.isDataTexture?g.texSubImage2D(g.TEXTURE_2D,ce,be,je,pe,fe,Qe,ht,ot.data):l.isCompressedTexture?g.compressedTexSubImage2D(g.TEXTURE_2D,ce,be,je,ot.width,ot.height,Qe,ot.data):g.texSubImage2D(g.TEXTURE_2D,ce,be,je,pe,fe,Qe,ht,ot);g.pixelStorei(g.UNPACK_ROW_LENGTH,St),g.pixelStorei(g.UNPACK_IMAGE_HEIGHT,We),g.pixelStorei(g.UNPACK_SKIP_PIXELS,Tt),g.pixelStorei(g.UNPACK_SKIP_ROWS,At),g.pixelStorei(g.UNPACK_SKIP_IMAGES,Vt),ce===0&&b.generateMipmaps&&g.generateMipmap(Ae),Te.unbindTexture()},this.initRenderTarget=function(l){a.get(l).__webglFramebuffer===void 0&&M.setupRenderTarget(l)},this.initTexture=function(l){l.isCubeTexture?M.setTextureCube(l,0):l.isData3DTexture?M.setTexture3D(l,0):l.isDataArrayTexture||l.isCompressedArrayTexture?M.setTexture2DArray(l,0):M.setTexture2D(l,0),Te.unbindTexture()},this.resetState=function(){R=0,H=0,V=null,Te.reset(),ie.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return xi}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(n){this._outputColorSpace=n;const t=this.getContext();t.drawingBufferColorSpace=lt._getDrawingBufferColorSpace(n),t.unpackColorSpace=lt._getUnpackColorSpace()}}const Na={type:"change"},fi={type:"start"},mr={type:"end"},Mn=new ko,Fa=new Va,qd=Math.cos(70*Wo.DEG2RAD),ct=new Ue,mt=2*Math.PI,Je={NONE:-1,ROTATE:0,DOLLY:1,PAN:2,TOUCH_ROTATE:3,TOUCH_PAN:4,TOUCH_DOLLY_PAN:5,TOUCH_DOLLY_ROTATE:6},ni=1e-6;class Zd extends Vo{constructor(n,t=null){super(n,t),this.state=Je.NONE,this.target=new Ue,this.cursor=new Ue,this.minDistance=0,this.maxDistance=1/0,this.minZoom=0,this.maxZoom=1/0,this.minTargetRadius=0,this.maxTargetRadius=1/0,this.minPolarAngle=0,this.maxPolarAngle=Math.PI,this.minAzimuthAngle=-1/0,this.maxAzimuthAngle=1/0,this.enableDamping=!1,this.dampingFactor=.05,this.enableZoom=!0,this.zoomSpeed=1,this.enableRotate=!0,this.rotateSpeed=1,this.keyRotateSpeed=1,this.enablePan=!0,this.panSpeed=1,this.screenSpacePanning=!0,this.keyPanSpeed=7,this.zoomToCursor=!1,this.autoRotate=!1,this.autoRotateSpeed=2,this.keys={LEFT:"ArrowLeft",UP:"ArrowUp",RIGHT:"ArrowRight",BOTTOM:"ArrowDown"},this.mouseButtons={LEFT:en.ROTATE,MIDDLE:en.DOLLY,RIGHT:en.PAN},this.touches={ONE:Jt.ROTATE,TWO:Jt.DOLLY_PAN},this.target0=this.target.clone(),this.position0=this.object.position.clone(),this.zoom0=this.object.zoom,this._cursorStyle="auto",this._domElementKeyEvents=null,this._lastPosition=new Ue,this._lastQuaternion=new sa,this._lastTargetPosition=new Ue,this._quat=new sa().setFromUnitVectors(n.up,new Ue(0,1,0)),this._quatInverse=this._quat.clone().invert(),this._spherical=new la,this._sphericalDelta=new la,this._scale=1,this._panOffset=new Ue,this._rotateStart=new at,this._rotateEnd=new at,this._rotateDelta=new at,this._panStart=new at,this._panEnd=new at,this._panDelta=new at,this._dollyStart=new at,this._dollyEnd=new at,this._dollyDelta=new at,this._dollyDirection=new Ue,this._mouse=new at,this._performCursorZoom=!1,this._pointers=[],this._pointerPositions={},this._controlActive=!1,this._onPointerMove=jd.bind(this),this._onPointerDown=$d.bind(this),this._onPointerUp=Qd.bind(this),this._onContextMenu=ru.bind(this),this._onMouseWheel=tu.bind(this),this._onKeyDown=nu.bind(this),this._onTouchStart=iu.bind(this),this._onTouchMove=au.bind(this),this._onMouseDown=Jd.bind(this),this._onMouseMove=eu.bind(this),this._interceptControlDown=ou.bind(this),this._interceptControlUp=su.bind(this),this.domElement!==null&&this.connect(this.domElement),this.update()}set cursorStyle(n){this._cursorStyle=n,n==="grab"?this.domElement.style.cursor="grab":this.domElement.style.cursor="auto"}get cursorStyle(){return this._cursorStyle}connect(n){super.connect(n),this.domElement.addEventListener("pointerdown",this._onPointerDown),this.domElement.addEventListener("pointercancel",this._onPointerUp),this.domElement.addEventListener("contextmenu",this._onContextMenu),this.domElement.addEventListener("wheel",this._onMouseWheel,{passive:!1}),this.domElement.getRootNode().addEventListener("keydown",this._interceptControlDown,{passive:!0,capture:!0}),this.domElement.style.touchAction="none"}disconnect(){this.domElement.removeEventListener("pointerdown",this._onPointerDown),this.domElement.ownerDocument.removeEventListener("pointermove",this._onPointerMove),this.domElement.ownerDocument.removeEventListener("pointerup",this._onPointerUp),this.domElement.removeEventListener("pointercancel",this._onPointerUp),this.domElement.removeEventListener("wheel",this._onMouseWheel),this.domElement.removeEventListener("contextmenu",this._onContextMenu),this.stopListenToKeyEvents(),this.domElement.getRootNode().removeEventListener("keydown",this._interceptControlDown,{capture:!0}),this.domElement.style.touchAction="auto"}dispose(){this.disconnect()}getPolarAngle(){return this._spherical.phi}getAzimuthalAngle(){return this._spherical.theta}getDistance(){return this.object.position.distanceTo(this.target)}listenToKeyEvents(n){n.addEventListener("keydown",this._onKeyDown),this._domElementKeyEvents=n}stopListenToKeyEvents(){this._domElementKeyEvents!==null&&(this._domElementKeyEvents.removeEventListener("keydown",this._onKeyDown),this._domElementKeyEvents=null)}saveState(){this.target0.copy(this.target),this.position0.copy(this.object.position),this.zoom0=this.object.zoom}reset(){this.target.copy(this.target0),this.object.position.copy(this.position0),this.object.zoom=this.zoom0,this.object.updateProjectionMatrix(),this.dispatchEvent(Na),this.update(),this.state=Je.NONE}pan(n,t){this._pan(n,t),this.update()}dollyIn(n){this._dollyIn(n),this.update()}dollyOut(n){this._dollyOut(n),this.update()}rotateLeft(n){this._rotateLeft(n),this.update()}rotateUp(n){this._rotateUp(n),this.update()}update(n=null){const t=this.object.position;ct.copy(t).sub(this.target),ct.applyQuaternion(this._quat),this._spherical.setFromVector3(ct),this.autoRotate&&this.state===Je.NONE&&this._rotateLeft(this._getAutoRotationAngle(n)),this.enableDamping?(this._spherical.theta+=this._sphericalDelta.theta*this.dampingFactor,this._spherical.phi+=this._sphericalDelta.phi*this.dampingFactor):(this._spherical.theta+=this._sphericalDelta.theta,this._spherical.phi+=this._sphericalDelta.phi);let i=this.minAzimuthAngle,o=this.maxAzimuthAngle;isFinite(i)&&isFinite(o)&&(i<-Math.PI?i+=mt:i>Math.PI&&(i-=mt),o<-Math.PI?o+=mt:o>Math.PI&&(o-=mt),i<=o?this._spherical.theta=Math.max(i,Math.min(o,this._spherical.theta)):this._spherical.theta=this._spherical.theta>(i+o)/2?Math.max(i,this._spherical.theta):Math.min(o,this._spherical.theta)),this._spherical.phi=Math.max(this.minPolarAngle,Math.min(this.maxPolarAngle,this._spherical.phi)),this._spherical.makeSafe(),this.enableDamping===!0?this.target.addScaledVector(this._panOffset,this.dampingFactor):this.target.add(this._panOffset),this.target.sub(this.cursor),this.target.clampLength(this.minTargetRadius,this.maxTargetRadius),this.target.add(this.cursor);let r=!1;if(this.zoomToCursor&&this._performCursorZoom||this.object.isOrthographicCamera)this._spherical.radius=this._clampDistance(this._spherical.radius);else{const f=this._spherical.radius;this._spherical.radius=this._clampDistance(this._spherical.radius*this._scale),r=f!=this._spherical.radius}if(ct.setFromSpherical(this._spherical),ct.applyQuaternion(this._quatInverse),t.copy(this.target).add(ct),this.object.lookAt(this.target),this.enableDamping===!0?(this._sphericalDelta.theta*=1-this.dampingFactor,this._sphericalDelta.phi*=1-this.dampingFactor,this._panOffset.multiplyScalar(1-this.dampingFactor)):(this._sphericalDelta.set(0,0,0),this._panOffset.set(0,0,0)),this.zoomToCursor&&this._performCursorZoom){let f=null;if(this.object.isPerspectiveCamera){const m=ct.length();f=this._clampDistance(m*this._scale);const P=m-f;this.object.position.addScaledVector(this._dollyDirection,P),this.object.updateMatrixWorld(),r=!!P}else if(this.object.isOrthographicCamera){const m=new Ue(this._mouse.x,this._mouse.y,0);m.unproject(this.object);const P=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),this.object.updateProjectionMatrix(),r=P!==this.object.zoom;const A=new Ue(this._mouse.x,this._mouse.y,0);A.unproject(this.object),this.object.position.sub(A).add(m),this.object.updateMatrixWorld(),f=ct.length()}else console.warn("WARNING: OrbitControls.js encountered an unknown camera type - zoom to cursor disabled."),this.zoomToCursor=!1;f!==null&&(this.screenSpacePanning?this.target.set(0,0,-1).transformDirection(this.object.matrix).multiplyScalar(f).add(this.object.position):(Mn.origin.copy(this.object.position),Mn.direction.set(0,0,-1).transformDirection(this.object.matrix),Math.abs(this.object.up.dot(Mn.direction))<qd?this.object.lookAt(this.target):(Fa.setFromNormalAndCoplanarPoint(this.object.up,this.target),Mn.intersectPlane(Fa,this.target))))}else if(this.object.isOrthographicCamera){const f=this.object.zoom;this.object.zoom=Math.max(this.minZoom,Math.min(this.maxZoom,this.object.zoom/this._scale)),f!==this.object.zoom&&(this.object.updateProjectionMatrix(),r=!0)}return this._scale=1,this._performCursorZoom=!1,r||this._lastPosition.distanceToSquared(this.object.position)>ni||8*(1-this._lastQuaternion.dot(this.object.quaternion))>ni||this._lastTargetPosition.distanceToSquared(this.target)>ni?(this.dispatchEvent(Na),this._lastPosition.copy(this.object.position),this._lastQuaternion.copy(this.object.quaternion),this._lastTargetPosition.copy(this.target),!0):!1}_getAutoRotationAngle(n){return n!==null?mt/60*this.autoRotateSpeed*n:mt/60/60*this.autoRotateSpeed}_getZoomScale(n){const t=Math.abs(n*.01);return Math.pow(.95,this.zoomSpeed*t)}_rotateLeft(n){this._sphericalDelta.theta-=n}_rotateUp(n){this._sphericalDelta.phi-=n}_panLeft(n,t){ct.setFromMatrixColumn(t,0),ct.multiplyScalar(-n),this._panOffset.add(ct)}_panUp(n,t){this.screenSpacePanning===!0?ct.setFromMatrixColumn(t,1):(ct.setFromMatrixColumn(t,0),ct.crossVectors(this.object.up,ct)),ct.multiplyScalar(n),this._panOffset.add(ct)}_pan(n,t){const i=this.domElement;if(this.object.isPerspectiveCamera){const o=this.object.position;ct.copy(o).sub(this.target);let r=ct.length();r*=Math.tan(this.object.fov/2*Math.PI/180),this._panLeft(2*n*r/i.clientHeight,this.object.matrix),this._panUp(2*t*r/i.clientHeight,this.object.matrix)}else this.object.isOrthographicCamera?(this._panLeft(n*(this.object.right-this.object.left)/this.object.zoom/i.clientWidth,this.object.matrix),this._panUp(t*(this.object.top-this.object.bottom)/this.object.zoom/i.clientHeight,this.object.matrix)):(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - pan disabled."),this.enablePan=!1)}_dollyOut(n){this.object.isPerspectiveCamera||this.object.isOrthographicCamera?this._scale/=n:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),this.enableZoom=!1)}_dollyIn(n){this.object.isPerspectiveCamera||this.object.isOrthographicCamera?this._scale*=n:(console.warn("WARNING: OrbitControls.js encountered an unknown camera type - dolly/zoom disabled."),this.enableZoom=!1)}_updateZoomParameters(n,t){if(!this.zoomToCursor)return;this._performCursorZoom=!0;const i=this.domElement.getBoundingClientRect(),o=n-i.left,r=t-i.top,f=i.width,m=i.height;this._mouse.x=o/f*2-1,this._mouse.y=-(r/m)*2+1,this._dollyDirection.set(this._mouse.x,this._mouse.y,1).unproject(this.object).sub(this.object.position).normalize()}_clampDistance(n){return Math.max(this.minDistance,Math.min(this.maxDistance,n))}_handleMouseDownRotate(n){this._rotateStart.set(n.clientX,n.clientY)}_handleMouseDownDolly(n){this._updateZoomParameters(n.clientX,n.clientX),this._dollyStart.set(n.clientX,n.clientY)}_handleMouseDownPan(n){this._panStart.set(n.clientX,n.clientY)}_handleMouseMoveRotate(n){this._rotateEnd.set(n.clientX,n.clientY),this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);const t=this.domElement;this._rotateLeft(mt*this._rotateDelta.x/t.clientHeight),this._rotateUp(mt*this._rotateDelta.y/t.clientHeight),this._rotateStart.copy(this._rotateEnd),this.update()}_handleMouseMoveDolly(n){this._dollyEnd.set(n.clientX,n.clientY),this._dollyDelta.subVectors(this._dollyEnd,this._dollyStart),this._dollyDelta.y>0?this._dollyOut(this._getZoomScale(this._dollyDelta.y)):this._dollyDelta.y<0&&this._dollyIn(this._getZoomScale(this._dollyDelta.y)),this._dollyStart.copy(this._dollyEnd),this.update()}_handleMouseMovePan(n){this._panEnd.set(n.clientX,n.clientY),this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd),this.update()}_handleMouseWheel(n){this._updateZoomParameters(n.clientX,n.clientY),n.deltaY<0?this._dollyIn(this._getZoomScale(n.deltaY)):n.deltaY>0&&this._dollyOut(this._getZoomScale(n.deltaY)),this.update()}_handleKeyDown(n){let t=!1;switch(n.code){case this.keys.UP:n.ctrlKey||n.metaKey||n.shiftKey?this.enableRotate&&this._rotateUp(mt*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(0,this.keyPanSpeed),t=!0;break;case this.keys.BOTTOM:n.ctrlKey||n.metaKey||n.shiftKey?this.enableRotate&&this._rotateUp(-mt*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(0,-this.keyPanSpeed),t=!0;break;case this.keys.LEFT:n.ctrlKey||n.metaKey||n.shiftKey?this.enableRotate&&this._rotateLeft(mt*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(this.keyPanSpeed,0),t=!0;break;case this.keys.RIGHT:n.ctrlKey||n.metaKey||n.shiftKey?this.enableRotate&&this._rotateLeft(-mt*this.keyRotateSpeed/this.domElement.clientHeight):this.enablePan&&this._pan(-this.keyPanSpeed,0),t=!0;break}t&&(n.preventDefault(),this.update())}_handleTouchStartRotate(n){if(this._pointers.length===1)this._rotateStart.set(n.pageX,n.pageY);else{const t=this._getSecondPointerPosition(n),i=.5*(n.pageX+t.x),o=.5*(n.pageY+t.y);this._rotateStart.set(i,o)}}_handleTouchStartPan(n){if(this._pointers.length===1)this._panStart.set(n.pageX,n.pageY);else{const t=this._getSecondPointerPosition(n),i=.5*(n.pageX+t.x),o=.5*(n.pageY+t.y);this._panStart.set(i,o)}}_handleTouchStartDolly(n){const t=this._getSecondPointerPosition(n),i=n.pageX-t.x,o=n.pageY-t.y,r=Math.sqrt(i*i+o*o);this._dollyStart.set(0,r)}_handleTouchStartDollyPan(n){this.enableZoom&&this._handleTouchStartDolly(n),this.enablePan&&this._handleTouchStartPan(n)}_handleTouchStartDollyRotate(n){this.enableZoom&&this._handleTouchStartDolly(n),this.enableRotate&&this._handleTouchStartRotate(n)}_handleTouchMoveRotate(n){if(this._pointers.length==1)this._rotateEnd.set(n.pageX,n.pageY);else{const i=this._getSecondPointerPosition(n),o=.5*(n.pageX+i.x),r=.5*(n.pageY+i.y);this._rotateEnd.set(o,r)}this._rotateDelta.subVectors(this._rotateEnd,this._rotateStart).multiplyScalar(this.rotateSpeed);const t=this.domElement;this._rotateLeft(mt*this._rotateDelta.x/t.clientHeight),this._rotateUp(mt*this._rotateDelta.y/t.clientHeight),this._rotateStart.copy(this._rotateEnd)}_handleTouchMovePan(n){if(this._pointers.length===1)this._panEnd.set(n.pageX,n.pageY);else{const t=this._getSecondPointerPosition(n),i=.5*(n.pageX+t.x),o=.5*(n.pageY+t.y);this._panEnd.set(i,o)}this._panDelta.subVectors(this._panEnd,this._panStart).multiplyScalar(this.panSpeed),this._pan(this._panDelta.x,this._panDelta.y),this._panStart.copy(this._panEnd)}_handleTouchMoveDolly(n){const t=this._getSecondPointerPosition(n),i=n.pageX-t.x,o=n.pageY-t.y,r=Math.sqrt(i*i+o*o);this._dollyEnd.set(0,r),this._dollyDelta.set(0,Math.pow(this._dollyEnd.y/this._dollyStart.y,this.zoomSpeed)),this._dollyOut(this._dollyDelta.y),this._dollyStart.copy(this._dollyEnd);const f=(n.pageX+t.x)*.5,m=(n.pageY+t.y)*.5;this._updateZoomParameters(f,m)}_handleTouchMoveDollyPan(n){this.enableZoom&&this._handleTouchMoveDolly(n),this.enablePan&&this._handleTouchMovePan(n)}_handleTouchMoveDollyRotate(n){this.enableZoom&&this._handleTouchMoveDolly(n),this.enableRotate&&this._handleTouchMoveRotate(n)}_addPointer(n){this._pointers.push(n.pointerId)}_removePointer(n){delete this._pointerPositions[n.pointerId];for(let t=0;t<this._pointers.length;t++)if(this._pointers[t]==n.pointerId){this._pointers.splice(t,1);return}}_isTrackingPointer(n){for(let t=0;t<this._pointers.length;t++)if(this._pointers[t]==n.pointerId)return!0;return!1}_trackPointer(n){let t=this._pointerPositions[n.pointerId];t===void 0&&(t=new at,this._pointerPositions[n.pointerId]=t),t.set(n.pageX,n.pageY)}_getSecondPointerPosition(n){const t=n.pointerId===this._pointers[0]?this._pointers[1]:this._pointers[0];return this._pointerPositions[t]}_customWheelEvent(n){const t=n.deltaMode,i={clientX:n.clientX,clientY:n.clientY,deltaY:n.deltaY};switch(t){case 1:i.deltaY*=16;break;case 2:i.deltaY*=100;break}return n.ctrlKey&&!this._controlActive&&(i.deltaY*=10),i}}function $d(e){this.enabled!==!1&&(this._pointers.length===0&&(this.domElement.setPointerCapture(e.pointerId),this.domElement.ownerDocument.addEventListener("pointermove",this._onPointerMove),this.domElement.ownerDocument.addEventListener("pointerup",this._onPointerUp)),!this._isTrackingPointer(e)&&(this._addPointer(e),e.pointerType==="touch"?this._onTouchStart(e):this._onMouseDown(e),this._cursorStyle==="grab"&&(this.domElement.style.cursor="grabbing")))}function jd(e){this.enabled!==!1&&(e.pointerType==="touch"?this._onTouchMove(e):this._onMouseMove(e))}function Qd(e){switch(this._removePointer(e),this._pointers.length){case 0:this.domElement.releasePointerCapture(e.pointerId),this.domElement.ownerDocument.removeEventListener("pointermove",this._onPointerMove),this.domElement.ownerDocument.removeEventListener("pointerup",this._onPointerUp),this.dispatchEvent(mr),this.state=Je.NONE,this._cursorStyle==="grab"&&(this.domElement.style.cursor="grab");break;case 1:const n=this._pointers[0],t=this._pointerPositions[n];this._onTouchStart({pointerId:n,pageX:t.x,pageY:t.y});break}}function Jd(e){let n;switch(e.button){case 0:n=this.mouseButtons.LEFT;break;case 1:n=this.mouseButtons.MIDDLE;break;case 2:n=this.mouseButtons.RIGHT;break;default:n=-1}switch(n){case en.DOLLY:if(this.enableZoom===!1)return;this._handleMouseDownDolly(e),this.state=Je.DOLLY;break;case en.ROTATE:if(e.ctrlKey||e.metaKey||e.shiftKey){if(this.enablePan===!1)return;this._handleMouseDownPan(e),this.state=Je.PAN}else{if(this.enableRotate===!1)return;this._handleMouseDownRotate(e),this.state=Je.ROTATE}break;case en.PAN:if(e.ctrlKey||e.metaKey||e.shiftKey){if(this.enableRotate===!1)return;this._handleMouseDownRotate(e),this.state=Je.ROTATE}else{if(this.enablePan===!1)return;this._handleMouseDownPan(e),this.state=Je.PAN}break;default:this.state=Je.NONE}this.state!==Je.NONE&&this.dispatchEvent(fi)}function eu(e){switch(this.state){case Je.ROTATE:if(this.enableRotate===!1)return;this._handleMouseMoveRotate(e);break;case Je.DOLLY:if(this.enableZoom===!1)return;this._handleMouseMoveDolly(e);break;case Je.PAN:if(this.enablePan===!1)return;this._handleMouseMovePan(e);break}}function tu(e){this.enabled===!1||this.enableZoom===!1||this.state!==Je.NONE||(e.preventDefault(),this.dispatchEvent(fi),this._handleMouseWheel(this._customWheelEvent(e)),this.dispatchEvent(mr))}function nu(e){this.enabled!==!1&&this._handleKeyDown(e)}function iu(e){switch(this._trackPointer(e),this._pointers.length){case 1:switch(this.touches.ONE){case Jt.ROTATE:if(this.enableRotate===!1)return;this._handleTouchStartRotate(e),this.state=Je.TOUCH_ROTATE;break;case Jt.PAN:if(this.enablePan===!1)return;this._handleTouchStartPan(e),this.state=Je.TOUCH_PAN;break;default:this.state=Je.NONE}break;case 2:switch(this.touches.TWO){case Jt.DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchStartDollyPan(e),this.state=Je.TOUCH_DOLLY_PAN;break;case Jt.DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchStartDollyRotate(e),this.state=Je.TOUCH_DOLLY_ROTATE;break;default:this.state=Je.NONE}break;default:this.state=Je.NONE}this.state!==Je.NONE&&this.dispatchEvent(fi)}function au(e){switch(this._trackPointer(e),this.state){case Je.TOUCH_ROTATE:if(this.enableRotate===!1)return;this._handleTouchMoveRotate(e),this.update();break;case Je.TOUCH_PAN:if(this.enablePan===!1)return;this._handleTouchMovePan(e),this.update();break;case Je.TOUCH_DOLLY_PAN:if(this.enableZoom===!1&&this.enablePan===!1)return;this._handleTouchMoveDollyPan(e),this.update();break;case Je.TOUCH_DOLLY_ROTATE:if(this.enableZoom===!1&&this.enableRotate===!1)return;this._handleTouchMoveDollyRotate(e),this.update();break;default:this.state=Je.NONE}}function ru(e){this.enabled!==!1&&e.preventDefault()}function ou(e){e.key==="Control"&&(this._controlActive=!0,this.domElement.getRootNode().addEventListener("keyup",this._interceptControlUp,{passive:!0,capture:!0}))}function su(e){e.key==="Control"&&(this._controlActive=!1,this.domElement.getRootNode().removeEventListener("keyup",this._interceptControlUp,{passive:!0,capture:!0}))}const Oa={dark:986906,navy:1710638,white:16119285,light:14541806},lu=new Xe(13159893),Tn=new Xe(43775),cu=.35,du=Ze.forwardRef(function({meshes:n,viewMode:t,showGrid:i,showAxes:o,bgColor:r,hiddenMeshes:f,measureMode:m,onMeasureResult:P,onCameraChange:A,onPartClick:G,autoRotate:D=!1,autoRotateSpeed:h=1.5},x){const S=Ze.useRef(null),I=Ze.useRef(null),c=Ze.useRef(null),s=Ze.useRef(null),_=Ze.useRef(null),T=Ze.useRef(null),v=Ze.useRef(null),y=Ze.useRef(null),C=Ze.useRef(null),U=Ze.useRef(10),d=Ze.useRef(new Map),p=Ze.useRef(new Map),$=Ze.useRef(new Map),R=Ze.useRef(null),H=Ze.useRef([]),V=Ze.useRef(null),z=Ze.useRef(m);z.current=m;const K=Ze.useRef(A);K.current=A;const N=Ze.useRef(G);N.current=G;function F(){const Y=R.current;if(Y!==null){const ae=p.current.get(Y),te=$.current.get(Y);ae&&te&&(ae.material=te),R.current=null}}function se(Y,ae){F();const te=p.current.get(Y);if(!te)return;const j=te.material;$.current.set(Y,j),R.current=Y;const de=Array.isArray(j)?j[0]:j;let Ce;de instanceof Zn?(Ce=de.clone(),Ce.emissive=Tn.clone(),Ce.emissiveIntensity=cu):de instanceof da?(Ce=de.clone(),Ce.emissive=Tn.clone()):Ce=new Zn({color:Tn,emissive:Tn,emissiveIntensity:.5,side:Et}),te.material=Ce,N.current?.(Y,ae)}return Ze.useImperativeHandle(x,()=>({setCamera(Y){const ae=c.current,te=_.current;if(!ae||!te)return;const j=U.current*2.2,Ce={front:[0,0,j],back:[0,0,-j],top:[0,j,.001],bottom:[0,-j,.001],left:[-j,0,0],right:[j,0,0],iso:[j*.8,j*.6,j*.8]}[Y];ae.position.set(Ce[0],Ce[1],Ce[2]),ae.lookAt(0,0,0),te.target.set(0,0,0),te.update()},fitToView(){const Y=c.current,ae=_.current;if(!Y||!ae)return;const te=U.current*1.8;Y.position.set(te,te*.7,te),Y.lookAt(0,0,0),ae.target.set(0,0,0),ae.update()},fitToPart(Y){const ae=c.current,te=_.current;if(!ae||!te||Y.length===0)return;const j=new Yn;for(const B of Y){const q=d.current.get(B);q&&j.union(new Yn().setFromObject(q))}if(j.isEmpty())return;const de=new Ue;j.getCenter(de);const Ce=new Ue;j.getSize(Ce);const me=Math.max(Ce.x,Ce.y,Ce.z)*2;ae.position.set(de.x+me,de.y+me*.5,de.z+me),ae.lookAt(de),te.target.copy(de),te.update()},clearMeasure(){H.current=[],V.current&&I.current&&(I.current.remove(V.current),V.current.traverse(Y=>{(Y instanceof vt||Y instanceof ca)&&(Y.geometry.dispose(),Y.material.dispose())}),V.current=null),P(null,null,null)}})),Ze.useEffect(()=>{if(!S.current)return;const Y=S.current.clientWidth,ae=S.current.clientHeight,te=new zo;te.background=new Xe(Oa[r]),I.current=te;const j=new un(45,Y/ae,.001,1e5);j.position.set(5,5,5),c.current=j;const de=new Kd({antialias:!0});de.setSize(Y,ae),de.setPixelRatio(Math.min(window.devicePixelRatio,2)),de.shadowMap.enabled=!0,de.shadowMap.type=ka,S.current.appendChild(de.domElement),s.current=de,te.add(new Xo(16777215,.7));const Ce=new Kn(16777215,1.4);Ce.position.set(10,20,10),Ce.castShadow=!0,te.add(Ce);const me=new Kn(13689087,.5);me.position.set(-10,-5,-10),te.add(me);const B=new Kn(16777215,.3);B.position.set(0,-20,0),te.add(B),te.add(new Yo(16777215,8952234,.5));const q=new Zd(j,de.domElement);q.enableDamping=!0,q.dampingFactor=.06,q.screenSpacePanning=!0,q.minPolarAngle=0,q.maxPolarAngle=Math.PI,q.minAzimuthAngle=-1/0,q.maxAzimuthAngle=1/0,_.current=q,q.addEventListener("change",()=>{K.current?.(j.quaternion.clone())});const Q=new Ko(200,100,3359846,2241348);Q.material.opacity=.4,Q.material.transparent=!0,te.add(Q),y.current=Q;const De=new qo(5);te.add(De),C.current=De;const _e=()=>{T.current=requestAnimationFrame(_e),q.update(),de.render(te,j)};_e();const Me=()=>{if(!S.current)return;const ke=S.current.clientWidth,Le=S.current.clientHeight;j.aspect=ke/Le,j.updateProjectionMatrix(),de.setSize(ke,Le)};return window.addEventListener("resize",Me),()=>{window.removeEventListener("resize",Me),T.current&&cancelAnimationFrame(T.current),q.dispose(),de.dispose(),S.current?.contains(de.domElement)&&S.current.removeChild(de.domElement)}},[]),Ze.useEffect(()=>{const Y=_.current;Y&&(Y.autoRotate=D,Y.autoRotateSpeed=h)},[D,h]),Ze.useEffect(()=>{const Y=s.current,ae=c.current,te=I.current;if(!Y||!ae||!te)return;const j=new Zo;let de={x:0,y:0};const Ce=B=>{de={x:B.clientX,y:B.clientY}},me=B=>{if(Math.abs(B.clientX-de.x)>5||Math.abs(B.clientY-de.y)>5||!S.current)return;const q=S.current.getBoundingClientRect(),Q=new at((B.clientX-q.left)/q.width*2-1,-((B.clientY-q.top)/q.height)*2+1);j.setFromCamera(Q,ae);const De=[];v.current?.traverse(Me=>{Me instanceof vt&&De.push(Me)});const _e=j.intersectObjects(De,!1);if(z.current){if(!_e.length)return;const Me=_e[0].point.clone();H.current.push(Me),V.current||(V.current=new qn,te.add(V.current));const ke=new vt(new Jo(U.current*.015,12,12),new Cn({color:16763904}));if(ke.position.copy(Me),V.current.add(ke),H.current.length>=2){const[Le,Fe]=[H.current[0],H.current[1]];V.current.add(new ca(new nn().setFromPoints([Le,Fe]),new fa({color:16763904}))),P(Le.distanceTo(Fe),Le,Fe),H.current=[]}}else{if(!_e.length){F(),N.current?.(null,null);return}const Me=_e[0].object;let ke=null;d.current.forEach((Le,Fe)=>{Le.traverse(He=>{He===Me&&(ke=Fe)})}),ke!==null&&(R.current===ke?(F(),N.current?.(null,null)):se(ke,Me.name))}};return Y.domElement.addEventListener("mousedown",Ce),Y.domElement.addEventListener("click",me),()=>{Y.domElement.removeEventListener("mousedown",Ce),Y.domElement.removeEventListener("click",me)}},[P]),Ze.useEffect(()=>{const Y=I.current;if(!Y||(F(),N.current?.(null,null),v.current&&(Y.remove(v.current),v.current.traverse(me=>{me instanceof vt&&(me.geometry.dispose(),Array.isArray(me.material)?me.material.forEach(B=>B.dispose()):me.material.dispose())}),v.current=null),d.current.clear(),p.current.clear(),$.current.clear(),!n.length))return;const ae=new qn;v.current=ae;const te=new Yn;n.forEach((me,B)=>{if(!me.positions.length)return;const q=new nn;q.setAttribute("position",new Dn(me.positions,3)),me.normals.length?q.setAttribute("normal",new Dn(me.normals,3)):q.computeVertexNormals(),me.indices.length&&q.setIndex(me.indices);let Q;me.color!==null&&me.color!==void 0?Q=new Xe(me.color[0],me.color[1],me.color[2]):Q=lu.clone();function De(He){return t==="wireframe"?new Cn({color:He,wireframe:!0}):t==="flat"?new da({color:He,side:Et,flatShading:!0}):t==="edges"?new Cn({color:1118498,side:Et}):new Zn({color:He,specular:new Xe(3355443),shininess:60,side:Et})}const _e=new qn;_e.name=me.name;const Me=Array.isArray(me.brepFaces)&&me.brepFaces.length>0;let ke,Le;if(Me){const He=De(Q);ke=[He];for(const Ke of me.brepFaces){const Ve=Ke.color!==null&&Ke.color!==void 0?new Xe(Ke.color[0],Ke.color[1],Ke.color[2]):Q.clone();ke.push(De(Ve))}const Ie=me.indices.length/3;let $e=0,g=0;for(;$e<Ie;){const Ke=$e;let Ve,Ye;g>=me.brepFaces.length?(Ve=Ie,Ye=0):$e<me.brepFaces[g].first?(Ve=me.brepFaces[g].first,Ye=0):(Ve=me.brepFaces[g].last+1,Ye=g+1,g++),q.addGroup(Ke*3,(Ve-Ke)*3,Ye),$e=Ve}Le=He}else Le=De(Q),ke=[Le];const Fe=new vt(q,ke.length>1?ke:Le);if(Fe.name=me.name,Fe.castShadow=!0,Fe.receiveShadow=!0,_e.add(Fe),t==="shaded"||t==="edges"){const He=new $o(q,t==="edges"?10:15),Ie=t==="edges"?Q:new Xe(0),$e=t==="edges"?1:.15;_e.add(new jo(He,new fa({color:Ie,transparent:t==="shaded",opacity:$e})))}_e.visible=!f.has(B),d.current.set(B,_e),p.current.set(B,Fe),$.current.set(B,Le),ae.add(_e),q.computeBoundingBox(),q.boundingBox&&te.union(q.boundingBox)}),Y.add(ae);const j=new Ue;te.getCenter(j),ae.position.sub(j);const de=new Ue;te.getSize(de);const Ce=Math.max(de.x,de.y,de.z)||10;if(U.current=Ce,y.current&&y.current.scale.setScalar(Ce*4/200),C.current&&C.current.scale.setScalar(Ce*.3),c.current&&_.current){const me=Ce*1.8;c.current.position.set(me,me*.7,me),c.current.lookAt(0,0,0),c.current.near=Ce*1e-4,c.current.far=Ce*200,c.current.updateProjectionMatrix(),_.current.target.set(0,0,0),_.current.minDistance=Ce*.005,_.current.maxDistance=Ce*100,_.current.update()}},[n,t]),Ze.useEffect(()=>{d.current.forEach((Y,ae)=>{Y.visible=!f.has(ae)})},[f]),Ze.useEffect(()=>{y.current&&(y.current.visible=i)},[i]),Ze.useEffect(()=>{C.current&&(C.current.visible=o)},[o]),Ze.useEffect(()=>{I.current&&(I.current.background=new Xe(Oa[r]))},[r]),Qo.jsx("div",{ref:S,className:"w-full h-full",style:{cursor:m?"crosshair":"pointer"}})});export{du as default};
