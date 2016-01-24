#version 330 core

out vec4 FragColor;

in VS_OUT
{
	vec3 FragPos;
	vec3 Normal;
	vec2 TexCoords;
	vec4 FragPosLightSpace;
}fs_in;


uniform sampler2D diffuseTexture;
uniform sampler2D shadowMap;

uniform vec3 lightPos;
uniform vec3 viewPos;

uniform bool shadows;

float ShadowCalculation(vec4 fragPosLightSpace)
{
	// perspective divide
	vec3 projCoords = fragPosLightSpace.xyz / fragPosLightSpace.w;
	// map [-1,1] to [0,1]
	projCoords = projCoords * 0.5 + 0.5;
	float closestDepth = texture(shadowMap, projCoords.xy).r;
	float currentDepth = projCoords.z;
	
	// fix shadow acne
	//float bias = 0.005;
	vec3 normal = normalize(fs_in.Normal);
	vec3 lightDir = normalize(lightPos - fs_in.FragPos);
	float bias = max(0.05* (1- dot(normal,lightDir)),0.005);
	//float shadow = currentDepth - bias > closestDepth ? 1.0 : 0.0;
	
	float shadow = 0.0;
	// optimize
	//if(currentDepth - bias > closestDepth)
	//{
	// PCF
	
	vec2 texelSize = 1.0 / textureSize(shadowMap, 0);
	for(int x = -1; x <= 1; ++x)
	{
		for(int y = -1; y <=1; ++y)
		{
			float pcfDepth = texture(shadowMap,projCoords.xy + vec2(x, y) * texelSize).r;
			shadow += currentDepth - bias > pcfDepth  ? 1.0 : 0.0;
		}
	}
	shadow /= 9.0;
	//}
	
	
	if(projCoords.z  > 1.0)
	{
		shadow = 0.0;
	}
	return shadow;
}

void main()
{
	vec3 color = texture(diffuseTexture, fs_in.TexCoords).rgb;
	vec3 normal = normalize(fs_in.Normal);
	vec3 lightColor = vec3(1.0);
	
	// ambient
	vec3 ambient = 0.3 * color;
	// diffuse
	vec3 lightDir = normalize(lightPos - fs_in.FragPos);
	float diffuseFactor = max(dot(lightDir,normal),0.0);
	vec3 diffuse = diffuseFactor * lightColor;
	// specular
	vec3 viewDir = normalize(viewPos - fs_in.FragPos);
	//vec3 reflectDir = reflect(-lightDir, normal);
	float specFactor = 0.0;
    vec3 halfwayDir = normalize(lightDir + viewDir);  
    specFactor = pow(max(dot(normal, halfwayDir), 0.0), 64.0);
    vec3 specular = specFactor * lightColor;  
	// calculate shadow
	float shadow =  ShadowCalculation(fs_in.FragPosLightSpace);                      
    vec3 lighting = (ambient + (1.0 - shadow) * (diffuse + specular)) * color;
	
	FragColor = vec4(lighting, 1.0f);
}